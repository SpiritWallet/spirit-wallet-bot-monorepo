// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import {
  COMMON_CONTRACT_ADDRESS,
  FUNCTIONS_CALLBACK_DATA_PREFIXS,
} from '@app/shared/constants';
import {
  sendAlreadyDeployedWalletMessage,
  sendDeployWalletFailedErrorMessage,
  sendDeployWalletSuccessMessage,
  sendInsufficientBalanceErrorMessage,
  sendInvolkeTransactionFailedErrorMessage,
  sendInvolkeTransactionSuccessMessage,
  sendNoWalletMessage,
  sendPortfolioMessage,
  sendSecurityAndPrivacyMessage,
} from '@app/shared/messages';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WalletDocument,
  Wallets,
  UserDocument,
  Erc20Balances,
  Erc20BalanceDocument,
  Chains,
  ChainDocument,
} from '@app/shared/models';
import {
  encodeAddress,
  decryptWithPBEAndSecret,
  getStarkPk,
} from '@app/shared/utils';
import { Web3Service } from '@app/web3/web3.service';
import { CallData, uint256 } from 'starknet';
import { parseUnits } from 'ethers';
import { ContractStandard } from '@app/shared/types';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallets.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Erc20Balances.name)
    private readonly erc20BalanceModel: Model<Erc20BalanceDocument>,
    @InjectModel(Chains.name)
    private readonly chainModel: Model<ChainDocument>,
    private readonly web3Service: Web3Service,
  ) {}

  classifyWalletFunction(
    bot: TelegramBot,
    callbackQuery: TelegramBot.CallbackQuery,
  ): boolean {
    const data = callbackQuery.data;
    const [fnPrefix, functionName] = data.split('_');
    const combinedPrefix = fnPrefix + '_' + functionName + '_';

    let isRequirePassword = false;
    switch (combinedPrefix) {
      case FUNCTIONS_CALLBACK_DATA_PREFIXS.DEPLOY_WALLET:
        isRequirePassword = true;
        break;
      case FUNCTIONS_CALLBACK_DATA_PREFIXS.PORTFOLIO:
        sendPortfolioMessage(bot, callbackQuery);
        break;
      case FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER:
        break;
      case FUNCTIONS_CALLBACK_DATA_PREFIXS.BULK_TRANSFER:
        break;
      case FUNCTIONS_CALLBACK_DATA_PREFIXS.SECURITY_AND_PRIVACY:
        sendSecurityAndPrivacyMessage(bot, callbackQuery);
        break;
    }

    return isRequirePassword;
  }

  async handleDeployWallet(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    user: UserDocument,
    address: string,
  ): Promise<string> {
    const wallet = await this.walletModel.findOne({
      chatId: user,
      address,
    });

    if (!wallet) {
      sendNoWalletMessage(bot, msg);
      return null;
    }

    if (wallet.isDeployed) {
      sendAlreadyDeployedWalletMessage(
        bot,
        msg,
        wallet.deployTxHash,
        encodeAddress(address),
      );
      return null;
    }

    // check if sufficient balance
    const walletBalance = await this.erc20BalanceModel.findOne({
      wallet: wallet._id,
      contractAddress: COMMON_CONTRACT_ADDRESS.ETH,
    });

    const { seedPhrase: encryptedSeedPhrase, iv, salt } = user;
    const seedPhrase = await decryptWithPBEAndSecret(
      encryptedSeedPhrase,
      msg.text,
      iv,
      salt,
    );

    const privateKey = getStarkPk(seedPhrase, wallet.index);

    // estimate gas
    const gas = await this.web3Service.estimateAccountDeployGas(
      address,
      privateKey,
    );

    if (Number(walletBalance.amount) < Number(gas)) {
      sendInsufficientBalanceErrorMessage(
        bot,
        msg,
        gas,
        encodeAddress(address),
      );
      return null;
    }

    // deploy wallet
    const txHash = await this.web3Service.deployAccount(address, privateKey);
    const isSuccess = await this.web3Service.awaitTransaction(txHash);

    if (!isSuccess.isSuccess) {
      sendDeployWalletFailedErrorMessage(
        bot,
        msg,
        txHash,
        encodeAddress(address),
      );
      return null;
    }

    // update wallet status
    await this.walletModel.updateOne(
      { _id: wallet._id },
      { isDeployed: true, deployTxHash: txHash },
    );

    sendDeployWalletSuccessMessage(bot, msg, txHash, encodeAddress(address));
    return txHash;
  }

  async handleTransferErc20(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    context: string,
  ): Promise<string> {
    const transferDetail = JSON.parse(context);
    const { wallet, contractDetail, receiver } = transferDetail;

    const chainDocument = await this.chainModel.findOne();
    const account = this.web3Service.getAccountInstance(
      wallet.address,
      wallet.privateKey,
      chainDocument.rpc,
    );

    const { transaction_hash: txHash } = await account.execute([
      {
        contractAddress: contractDetail.address,
        entrypoint: 'transfer',
        calldata: CallData.compile({
          recipient: receiver,
          amount: uint256.bnToUint256(
            Number(
              parseUnits(
                transferDetail.amount,
                transferDetail.contractDetail.decimals,
              ),
            ) - Number(transferDetail.estimatedFee),
          ),
        }),
      },
    ]);

    await this.web3Service.awaitTransaction(txHash);
    const isSuccess = await this.web3Service.awaitTransaction(txHash);

    if (!isSuccess.isSuccess) {
      sendInvolkeTransactionFailedErrorMessage(
        bot,
        msg,
        txHash,
        encodeAddress(wallet.address),
      );
      return null;
    }

    sendInvolkeTransactionSuccessMessage(
      bot,
      msg,
      txHash,
      encodeAddress(wallet.address),
    );

    return txHash;
  }

  async handleTransferNft(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    context: string,
  ): Promise<string> {
    const transferDetail = JSON.parse(context);
    const { wallet, contractDetail, receiver, amount } = transferDetail;

    const chainDocument = await this.chainModel.findOne();
    const account = this.web3Service.getAccountInstance(
      wallet.address,
      wallet.privateKey,
      chainDocument.rpc,
    );

    const callDataSnakeCase =
      contractDetail.standard === ContractStandard.ERC721
        ? [
            {
              contractAddress: contractDetail.address,
              entrypoint: 'transfer_from',
              calldata: CallData.compile({
                from: wallet.address,
                to: receiver,
                token_id: uint256.bnToUint256(transferDetail.tokenId),
              }),
            },
          ]
        : [
            {
              contractAddress: contractDetail.address,
              entrypoint: 'safe_transfer_from',
              calldata: CallData.compile({
                from: wallet.address,
                to: receiver,
                token_id: uint256.bnToUint256(transferDetail.tokenId),
                value: uint256.bnToUint256(amount),
                data: [],
              }),
            },
          ];

    const calldataCamelCase =
      contractDetail.standard === ContractStandard.ERC721
        ? [
            {
              contractAddress: contractDetail.address,
              entrypoint: 'transferFrom',
              calldata: CallData.compile({
                from: wallet.address,
                to: receiver,
                token_id: uint256.bnToUint256(transferDetail.tokenId),
              }),
            },
          ]
        : [
            {
              contractAddress: contractDetail.address,
              entrypoint: 'safeTransferFrom',
              calldata: CallData.compile({
                from: wallet.address,
                to: receiver,
                token_id: uint256.bnToUint256(transferDetail.tokenId),
                value: uint256.bnToUint256(amount),
                data: [],
              }),
            },
          ];

    let txHash: string = null;
    try {
      txHash = (await account.execute(callDataSnakeCase)).transaction_hash;
    } catch (error) {
      if (error.message.includes('not found in contract.')) {
        txHash = (await account.execute(calldataCamelCase)).transaction_hash;
      } else {
        throw new Error(error.message);
      }
    }

    await this.web3Service.awaitTransaction(txHash);
    const isSuccess = await this.web3Service.awaitTransaction(txHash);

    if (!isSuccess.isSuccess) {
      sendInvolkeTransactionFailedErrorMessage(
        bot,
        msg,
        txHash,
        encodeAddress(wallet.address),
      );
      return null;
    }

    sendInvolkeTransactionSuccessMessage(
      bot,
      msg,
      txHash,
      encodeAddress(wallet.address),
    );

    return txHash;
  }
}
