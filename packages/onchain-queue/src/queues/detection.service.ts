// SPDX-License-Identifier: MIT

import {
  ERC1155TransferReturnValue,
  ERC721OrERC20TransferReturnValue,
} from '@app/web3/decodeEvent';
import { Web3Service } from '@app/web3/web3.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import {
  EventType,
  JOB_QUEUE_NFT_METADATA,
  LogsReturnValues,
  QUEUE_METADATA,
  TransactionStatus,
  TransactionType,
} from '@app/shared/types';
import { Queue } from 'bull';
import {
  ChainDocument,
  ContractDetailDocument,
  ContractDetails,
  NftBalanceDocument,
  NftBalances,
  NftDetailDocument,
  NftDetails,
  TransactionDocument,
  Transactions,
  WalletDocument,
  Wallets,
} from '@app/shared/models';
import { formattedContractAddress } from '@app/shared/utils';

@Injectable()
export class DetectionSerivce {
  constructor(
    @InjectModel(ContractDetails.name)
    private readonly contractDetailModel: Model<ContractDetailDocument>,
    @InjectModel(NftBalances.name)
    private readonly nftBalanceModel: Model<NftBalanceDocument>,
    @InjectModel(NftDetails.name)
    private readonly nftDetailModel: Model<NftDetailDocument>,
    @InjectModel(Transactions.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallets.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectQueue(QUEUE_METADATA)
    private readonly fetchMetadataQueue: Queue<string>,
    private readonly web3Service: Web3Service,
  ) {}

  logger = new Logger(DetectionSerivce.name);

  async processEvent(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const process: any = {};
    process[EventType.MINT_721] = this.processNft721Minted;
    process[EventType.BURN_721] = this.processNft721Burned;
    process[EventType.TRANSFER_721] = this.processNft721Transfered;
    process[EventType.MINT_1155] = this.processNft1155Minted;
    process[EventType.BURN_1155] = this.processNft1155Burned;
    process[EventType.TRANSFER_1155] = this.processNft1155Transfered;

    await process[log.eventType].call(this, log, chain, index);
  }

  async getOrCreateContractDetail(
    address: string,
    chain: ChainDocument,
  ): Promise<ContractDetailDocument> {
    const formattedAddress = formattedContractAddress(address);
    const contractInfo = await this.contractDetailModel.findOne({
      address: formattedAddress,
    });

    if (contractInfo) {
      return contractInfo;
    }

    const contractOnchainInfo = await this.web3Service.getContractDetail(
      formattedAddress,
      chain.rpc,
    );

    if (!contractOnchainInfo) return null;

    const contractDetailEntity: ContractDetails = {
      chain,
      address: formattedAddress,
      standard: contractOnchainInfo.standard,
      name: contractOnchainInfo.name,
      symbol: contractOnchainInfo.symbol,
    };

    const contractDetaiDocument =
      await this.contractDetailModel.findOneAndUpdate(
        {
          address: formattedAddress,
        },
        { $set: contractDetailEntity },
        { upsert: true, new: true },
      );
    return contractDetaiDocument;
  }

  async getOrCreateNftDetail(
    address: string,
    tokenId: string,
    chain: ChainDocument,
  ): Promise<NftDetailDocument> {
    const formattedAddress = formattedContractAddress(address);
    const nftDetail = await this.nftDetailModel.findOne({
      contractAddress: formattedAddress,
      tokenId,
    });

    if (nftDetail) {
      return nftDetail;
    }

    const nftDetailEntity: NftDetails = {
      chain,
      contractAddress: formattedAddress,
      tokenId,
    };

    const nftDetailDocument = await this.nftDetailModel.findOneAndUpdate(
      {
        contractAddress: formattedAddress,
        tokenId,
      },
      { $set: nftDetailEntity },
      { upsert: true, new: true },
    );

    await this.fetchMetadataQueue.add(JOB_QUEUE_NFT_METADATA, nftDetail._id);
    return nftDetailDocument;
  }

  async processNft721Minted(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const {
      from,
      to,
      value: tokenId,
      contractAddress,
      timestamp,
    } = log.returnValues as ERC721OrERC20TransferReturnValue;

    const toUser = await this.walletModel.findOne({ address: to });
    if (!toUser) return;

    const contractDetail = await this.getOrCreateContractDetail(
      contractAddress,
      chain,
    );

    if (!contractDetail) return;

    const existedNft = await this.nftBalanceModel.findOne({
      contractAddress,
      tokenId,
    });

    if (existedNft) {
      if (existedNft.latestTimestamp < timestamp) {
        existedNft.wallet = toUser;
        await existedNft.save();
      }
    } else {
      const nftDetail = await this.getOrCreateNftDetail(
        contractAddress,
        tokenId,
        chain,
      );

      const newBalanceEntity: NftBalances = {
        chain,
        wallet: toUser,
        contractAddress,
        tokenId,
        nftDetail,
        amount: '1',
        latestTimestamp: timestamp,
      };

      await this.nftBalanceModel.findOneAndUpdate(
        {
          contractAddress,
          tokenId,
        },
        { $set: newBalanceEntity },
        { new: true, upsert: true },
      );
    }

    const transactionDetail: Transactions = {
      hash: log.transaction_hash,
      index: log.index,
      chain,
      contractAddress,
      tokenId,
      amount: '1',
      from,
      to,
      status: TransactionStatus.Success,
      entryPoint: '',
      type: TransactionType.Mint,
    };

    await this.transactionModel.findOneAndUpdate(
      {
        hash: log.transaction_hash,
        index,
      },
      { $set: transactionDetail },
      { upsert: true, new: true },
    );

    this.logger.debug(
      `nft minted ${contractAddress}: ${tokenId} ${from} -> ${to} - ${timestamp}`,
    );
  }

  async processNft721Burned(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const {
      from,
      to,
      value: tokenId,
      contractAddress,
      timestamp,
    } = log.returnValues as ERC721OrERC20TransferReturnValue;

    const fromWallet = await this.walletModel.findOne({ address: from });
    if (!fromWallet) return;

    const contractDetail = await this.getOrCreateContractDetail(
      contractAddress,
      chain,
    );

    if (!contractDetail) return;

    await this.nftBalanceModel.deleteOne({
      contractAddress,
      tokenId,
    });

    await this.nftDetailModel.deleteOne({
      contractAddress,
      tokenId,
    });

    const transactionDetail: Transactions = {
      hash: log.transaction_hash,
      index,
      chain,
      contractAddress,
      tokenId,
      amount: '1',
      from,
      to,
      status: TransactionStatus.Success,
      entryPoint: '',
      type: TransactionType.Burn,
    };

    await this.transactionModel.findOneAndUpdate(
      {
        hash: log.transaction_hash,
        index,
      },
      { $set: transactionDetail },
      { upsert: true, new: true },
    );

    this.logger.debug(
      `nft burned ${contractAddress}: ${tokenId} at - ${timestamp}`,
    );
  }

  async processNft721Transfered(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const {
      from,
      to,
      value: tokenId,
      contractAddress,
      timestamp,
    } = log.returnValues as ERC721OrERC20TransferReturnValue;

    const fromWallet = await this.walletModel.findOne({ address: from });
    const toWallet = await this.walletModel.findOne({ address: to });
    if (!fromWallet && !toWallet) return;

    const nftCollection = await this.getOrCreateContractDetail(
      contractAddress,
      chain,
    );

    if (!nftCollection) return;

    const nftBalance = await this.nftBalanceModel.findOne({
      contractAddress,
      tokenId,
    });

    // update nft balance
    if (nftBalance && nftBalance.latestTimestamp < timestamp) {
      if (toWallet) {
        nftBalance.wallet = toWallet;
        nftBalance.latestTimestamp = timestamp;
        await nftBalance.save();
      } else {
        await this.nftBalanceModel.deleteOne({
          _id: nftBalance._id,
        });
      }
    } else {
      const nftDetail = await this.getOrCreateNftDetail(
        contractAddress,
        tokenId,
        chain,
      );

      const newNftBalance: NftBalances = {
        chain,
        contractAddress,
        tokenId,
        nftDetail,
        amount: '1',
        latestTimestamp: timestamp,
        wallet: toWallet,
      };

      await this.nftBalanceModel.findOneAndUpdate(
        {
          contractAddress,
          tokenId,
        },
        { $set: newNftBalance },
        { new: true, upsert: true },
      );
    }

    const transactionDetail: Transactions = {
      hash: log.transaction_hash,
      index,
      chain,
      contractAddress,
      tokenId,
      from,
      to,
      amount: '1',
      status: TransactionStatus.Success,
      entryPoint: '',
      type: TransactionType.Transfer,
    };

    await this.transactionModel.findOneAndUpdate(
      {
        hash: log.transaction_hash,
        index,
      },
      { $set: transactionDetail },
      { upsert: true, new: true },
    );

    this.logger.debug(
      `nft transfer ${contractAddress}: ${tokenId} from ${from} -> ${to} at - ${timestamp}`,
    );
  }

  async processNft1155Minted(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const { from, to, tokenId, nftAddress, timestamp, value } =
      log.returnValues as ERC1155TransferReturnValue;

    const toWallet = await this.walletModel.findOne({ address: to });
    if (!toWallet) return;

    const contractDetail = await this.getOrCreateContractDetail(
      nftAddress,
      chain,
    );

    if (!contractDetail) return;

    const onchainBalance = await this.web3Service.getERC1155Balance(
      nftAddress,
      to,
      tokenId,
    );

    if (onchainBalance !== '0') {
      const nftDetail = await this.getOrCreateNftDetail(
        nftAddress,
        tokenId,
        chain,
      );

      const newNftBalance: NftBalances = {
        chain,
        wallet: toWallet,
        contractAddress: nftAddress,
        tokenId,
        nftDetail,
        amount: onchainBalance,
        latestTimestamp: timestamp,
      };

      await this.nftBalanceModel.findOneAndUpdate(
        {
          nftContract: nftAddress,
          tokenId,
          wallet: toWallet._id,
        },
        { $set: newNftBalance },
        { new: true, upsert: true },
      );
    }

    const transactionDetail: Transactions = {
      hash: log.transaction_hash,
      index,
      chain,
      contractAddress: nftAddress,
      tokenId,
      from,
      to,
      amount: value,
      status: TransactionStatus.Success,
      entryPoint: '',
      type: TransactionType.Mint,
    };

    await this.transactionModel.findOneAndUpdate(
      {
        hash: log.transaction_hash,
        index,
      },
      { $set: transactionDetail },
      { upsert: true, new: true },
    );

    this.logger.debug(
      `${value} nft minted ${nftAddress}: ${tokenId} ${from} -> ${to} - ${timestamp}`,
    );
  }

  async processNft1155Burned(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const { from, to, tokenId, nftAddress, timestamp, value } =
      log.returnValues as ERC1155TransferReturnValue;

    const fromWallet = await this.walletModel.findOne({ address: from });

    if (!fromWallet) return;

    const contractDetail = await this.getOrCreateContractDetail(
      nftAddress,
      chain,
    );

    if (!contractDetail) return;

    const onchainBalance = await this.web3Service.getERC1155Balance(
      nftAddress,
      from,
      tokenId,
    );

    if (onchainBalance !== '0') {
      const nftDetail = await this.getOrCreateNftDetail(
        nftAddress,
        tokenId,
        chain,
      );

      const newNftBalance: NftBalances = {
        chain,
        wallet: fromWallet,
        contractAddress: nftAddress,
        tokenId,
        nftDetail,
        amount: onchainBalance,
        latestTimestamp: timestamp,
      };

      await this.nftBalanceModel.findOneAndUpdate(
        {
          nftContract: nftAddress,
          tokenId,
          wallet: fromWallet._id,
        },
        { $set: newNftBalance },
        { new: true, upsert: true },
      );
    }

    const transactionDetail: Transactions = {
      hash: log.transaction_hash,
      index,
      chain,
      contractAddress: nftAddress,
      tokenId,
      from,
      to,
      amount: value,
      status: TransactionStatus.Success,
      entryPoint: '',
      type: TransactionType.Burn,
    };

    await this.transactionModel.findOneAndUpdate(
      {
        txHash: log.transaction_hash,
        index,
      },
      { $set: transactionDetail },
      { upsert: true, new: true },
    );

    this.logger.debug(
      `${value} nft burned ${nftAddress}: ${tokenId} ${from} -> ${to} - ${timestamp}`,
    );
  }

  async processNft1155Transfered(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const { from, to, tokenId, nftAddress, timestamp, value } =
      log.returnValues as ERC1155TransferReturnValue;

    const fromWallet = await this.walletModel.findOne({ address: from });
    const toWallet = await this.walletModel.findOne({ address: to });
    if (!fromWallet && !toWallet) return;

    const contractDetail = await this.getOrCreateContractDetail(
      nftAddress,
      chain,
    );

    if (!contractDetail) return;

    const nftDetail = await this.getOrCreateNftDetail(
      nftAddress,
      tokenId,
      chain,
    );
    if (fromWallet) {
      const fromBalance = await this.web3Service.getERC1155Balance(
        nftAddress,
        from,
        tokenId,
      );
      if (fromBalance !== '0') {
        const newNftBalance: NftBalances = {
          chain,
          wallet: fromWallet,
          contractAddress: nftAddress,
          tokenId,
          nftDetail,
          amount: fromBalance,
          latestTimestamp: timestamp,
        };
        await this.nftBalanceModel.findOneAndUpdate(
          {
            nftContract: nftAddress,
            tokenId,
            wallet: fromWallet._id,
          },
          { $set: newNftBalance },
          { new: true, upsert: true },
        );
      } else {
        await this.nftBalanceModel.deleteOne({
          nftContract: nftAddress,
          tokenId,
          wallet: fromWallet._id,
        });
      }
    }

    if (toWallet) {
      const toBalance = await this.web3Service.getERC1155Balance(
        nftAddress,
        to,
        tokenId,
      );
      if (toBalance !== '0') {
        const newNftBalance: NftBalances = {
          chain,
          wallet: toWallet,
          contractAddress: nftAddress,
          tokenId,
          nftDetail,
          amount: toBalance,
          latestTimestamp: timestamp,
        };
        await this.nftBalanceModel.findOneAndUpdate(
          {
            nftContract: nftAddress,
            tokenId,
            wallet: toWallet._id,
          },
          { $set: newNftBalance },
          { new: true, upsert: true },
        );
      } else {
        await this.nftBalanceModel.deleteOne({
          nftContract: nftAddress,
          tokenId,
          wallet: toWallet._id,
        });
      }
    }

    const transactionDetail: Transactions = {
      hash: log.transaction_hash,
      index,
      chain,
      contractAddress: nftAddress,
      tokenId,
      from,
      to,
      amount: value,
      status: TransactionStatus.Success,
      entryPoint: '',
      type: TransactionType.Transfer,
    };

    await this.transactionModel.findOneAndUpdate(
      {
        hash: log.transaction_hash,
        index,
      },
      { $set: transactionDetail },
      { upsert: true, new: true },
    );

    this.logger.debug(
      `${value} nft transfers ${nftAddress}: ${tokenId} ${from} -> ${to} - ${timestamp}`,
    );
  }
}
