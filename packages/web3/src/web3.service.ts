// SPDX-License-Identifier: MIT

import { ChainDocument, Chains } from '@app/shared/models';
import { Injectable } from '@nestjs/common';
import {
  Provider,
  Contract,
  Account,
  CallData,
  GetTransactionReceiptResponse,
} from 'starknet';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { convertDataIntoString, getPubKey } from '@app/shared/utils';
import {
  BURN_ADDRESS,
  ContractStandard,
  EventTopic,
  EventType,
  InterfaceId,
  LogsReturnValues,
} from '@app/shared/types';
import {
  ERC1155TransferReturnValue,
  ERC721OrERC20TransferReturnValue,
  decodeERC115Transfer,
  decodeERC115TransferBatch,
  decodeERC721OrERC20Transfer,
} from './decodeEvent';
import { ABIS } from './abi';
import { attemptOperations, delay } from '@app/shared/utils/promise';
import { SEQUENCER_ADDRESS } from '@app/shared/constants';

@Injectable()
export class Web3Service {
  constructor(
    @InjectModel(Chains.name)
    private readonly chainModel: Model<ChainDocument>,
  ) {}

  getProvider(rpc: string) {
    const provider = new Provider({ nodeUrl: rpc });
    return provider;
  }

  async getBlockTime(rpc?: string) {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpc;
    }
    const provider = this.getProvider(rpc);
    const block = await provider.getBlock('pending');
    return block.timestamp * 1e3;
  }

  getContractInstance(
    abi: any,
    contractAddress: string,
    rpc: string,
  ): Contract {
    const provider = this.getProvider(rpc);
    const contractInstance = new Contract(abi, contractAddress, provider);
    return contractInstance;
  }

  getAccountInstance(address: string, privateKey: string, rpc: string) {
    const provider = this.getProvider(rpc);
    const account = new Account(provider, address, privateKey, '1', '0x2');
    return account;
  }

  async estimateAccountDeployGas(
    address: string,
    privateKey: string,
    rpc?: string,
  ): Promise<string> {
    const chain = await this.chainModel.findOne();

    if (!rpc) {
      rpc = chain.rpc;
    }

    const account = await this.getAccountInstance(address, privateKey, rpc);
    const starkPub = getPubKey(privateKey);
    const AccountConstructorCallData = CallData.compile({
      public_key: starkPub,
    });

    const { suggestedMaxFee: estimatedFee1 } =
      await account.estimateAccountDeployFee({
        classHash: chain.walletClassHash,
        constructorCalldata: AccountConstructorCallData,
        addressSalt: starkPub,
      });

    return estimatedFee1.toString();
  }

  async deployAccount(address: string, privateKey: string, rpc?: string) {
    const chain = await this.chainModel.findOne();

    if (!rpc) {
      rpc = chain.rpc;
    }
    const provider = this.getProvider(rpc);
    const account = await this.getAccountInstance(address, privateKey, rpc);
    const starkPub = getPubKey(privateKey);
    const AccountConstructorCallData = CallData.compile({
      public_key: starkPub,
    });

    const { transaction_hash: txHash } = await account.deploySelf({
      classHash: chain.walletClassHash,
      constructorCalldata: AccountConstructorCallData,
      addressSalt: starkPub,
    });

    await provider.waitForTransaction(txHash);
    return txHash;
  }

  async getERC1155Balance(
    address: string,
    owner: string,
    tokenId: string,
    rpc?: string,
  ): Promise<string> {
    const chain = await this.chainModel.findOne();

    if (!rpc) {
      rpc = chain.rpc;
    }

    const contractInstance = this.getContractInstance(
      ABIS.ERC1155ABI,
      address,
      rpc,
    );
    const balanecOfOperator = [
      () => contractInstance.balanceOf(owner, tokenId),
      () => contractInstance.balance_of(owner, tokenId),
    ];

    const balance: BigInt = await attemptOperations(balanecOfOperator);

    return balance.toString();
  }

  async getErc20Balance(
    address: string,
    owner: string,
    rpc?: string,
  ): Promise<string> {
    const chain = await this.chainModel.findOne();

    if (!rpc) {
      rpc = chain.rpc;
    }

    const contractInstance = this.getContractInstance(
      ABIS.ERC20ABI,
      address,
      rpc,
    );
    const balanceOfOperator = [
      () => contractInstance.balanceOf(owner),
      () => contractInstance.balance_of(owner),
    ];

    const balance: BigInt = await attemptOperations(balanceOfOperator);

    return balance.toString();
  }

  async awaitTransaction(
    txHash: string,
    rpc?: string,
  ): Promise<{ isSuccess: boolean }> {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpc;
    }
    const provider = this.getProvider(rpc);
    let isFinished = false;
    let isSuccess = false;
    await provider.waitForTransaction(txHash);
    while (!isFinished) {
      const tx = await provider.getTransactionReceipt(txHash);
      if (tx) {
        if (tx.isSuccess()) {
          isSuccess = true;
        }

        isFinished = true;
      }

      await delay(5);
    }

    return { isSuccess };
  }

  async checkInterfaceSupported(
    address: string,
    rpc: string,
    interfaceId: string,
  ): Promise<boolean | null> {
    const provider = this.getProvider(rpc);
    const src5Instance = new Contract(ABIS.SRC5ABI, address, provider);
    const supportInterfaceOperators = [
      () => src5Instance.supports_interface(interfaceId),
      () => src5Instance.supportsInterface(interfaceId),
    ];
    return await attemptOperations(supportInterfaceOperators);
  }

  async checkIfContractIsERC20(
    address: string,
    rpc: string,
  ): Promise<boolean | null> {
    const provider = this.getProvider(rpc);
    const erc20Instance = new Contract(ABIS.ERC20ABI, address, provider);
    try {
      await erc20Instance.name();
      await erc20Instance.symbol();
      await erc20Instance.decimals();
      await erc20Instance.totalSupply();
      await erc20Instance.balanceOf(address);
      await erc20Instance.allowance(address, address);
      return true;
    } catch (error) {
      return null;
    }
  }

  async getContractStandard(
    address: string,
    rpc: string,
  ): Promise<ContractStandard | null> {
    const isERC721 =
      (await this.checkInterfaceSupported(address, rpc, InterfaceId.ERC721)) ||
      (await this.checkInterfaceSupported(
        address,
        rpc,
        InterfaceId.OLD_ERC721,
      ));
    if (isERC721 === true) {
      return ContractStandard.ERC721;
    }

    const isERC1155 =
      (await this.checkInterfaceSupported(address, rpc, InterfaceId.ERC1155)) ||
      (await this.checkInterfaceSupported(
        address,
        rpc,
        InterfaceId.OLD_ERC1155,
      ));
    if (isERC1155 === true) {
      return ContractStandard.ERC1155;
    }

    const isERC20 = await this.checkIfContractIsERC20(address, rpc);
    if (isERC20 === true) {
      return ContractStandard.ERC20;
    }

    return null;
  }

  async getContractDetail(
    address: string,
    rpc: string,
  ): Promise<{
    standard: ContractStandard;
    name: string;
    symbol: string;
    decimals: number;
  }> {
    const standard = await this.getContractStandard(address, rpc);

    if (!standard) return null;

    if (standard === ContractStandard.ERC20) {
      const erc20Detail = await this.getErc20Detail(address, rpc);
      return {
        standard: standard,
        name: erc20Detail.name,
        symbol: erc20Detail.symbol,
        decimals: erc20Detail.decimals,
      };
    }
    const nftCollectionDetail = await this.getNFTCollectionDetail(address, rpc);
    return {
      standard: standard,
      name: nftCollectionDetail.name,
      symbol: nftCollectionDetail.symbol,
      decimals: 1,
    };
  }

  async getErc20Detail(
    address: string,
    rpc: string,
  ): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> {
    const provider = this.getProvider(rpc);
    const erc20Instance = new Contract(ABIS.ERC20ABI, address, provider);

    const name = await erc20Instance.name();
    const symbol = await erc20Instance.symbol();
    const decimals = await erc20Instance.decimals();

    return {
      name: name ? convertDataIntoString(name) : null,
      symbol: symbol ? convertDataIntoString(symbol) : null,
      decimals: Number(decimals.toString()),
    };
  }

  async getNFTCollectionDetail(
    address: string,
    rpc: string,
  ): Promise<{
    standard: ContractStandard;
    name: string;
    symbol: string;
  } | null> {
    const provider = this.getProvider(rpc);
    const standard = await this.getContractStandard(address, rpc);

    if (!standard || standard === ContractStandard.ERC20) {
      return null;
    }

    const contractInstance = new Contract(ABIS.ERC721ABI, address, provider);
    const otherVerContract = new Contract(
      ABIS.OtherErc721ABI,
      address,
      provider,
    );
    const oldVerContract = new Contract(ABIS.OldErc721ABI, address, provider);

    // List of operations to retrieve the contract name
    const nameOperations = [
      () => contractInstance.name(),
      () => otherVerContract.name(),
      () => oldVerContract.name(),
    ];

    // List of operations to retrieve the contract symbol
    const symbolOperations = [
      () => contractInstance.symbol(),
      () => otherVerContract.symbol(),
      () => oldVerContract.symbol(),
    ];

    const name = await attemptOperations(nameOperations);
    const symbol = await attemptOperations(symbolOperations);

    return {
      name: name ? convertDataIntoString(name) : null,
      symbol: symbol ? convertDataIntoString(symbol) : null,
      standard,
    };
  }

  async getNFTUri(
    contractAddress: string,
    tokenId: string,
    standard: ContractStandard,
    rpc: string,
  ): Promise<string> {
    const provider = this.getProvider(rpc);

    let abi: any = ABIS.ERC721ABI;
    let otherVerAbi: any = ABIS.OtherErc721ABI;
    let oldVerAbi: any = ABIS.OldErc721ABI;
    if (standard === ContractStandard.ERC1155) {
      abi = ABIS.ERC1155ABI;
      otherVerAbi = ABIS.OtherErc1155ABI;
      oldVerAbi = ABIS.OldErc1155ABI;
    }

    const contractInstance = new Contract(abi, contractAddress, provider);
    const otherVerContract = new Contract(
      otherVerAbi,
      contractAddress,
      provider,
    );
    const oldVerContract = new Contract(oldVerAbi, contractAddress, provider);

    const tokenUriOperations = [
      () => contractInstance.token_uri(tokenId),
      () => contractInstance.tokenURI(tokenId),
      () => contractInstance.uri(tokenId),
      () => otherVerContract.token_uri(tokenId),
      () => otherVerContract.tokenURI(tokenId),
      () => otherVerContract.uri(tokenId),
      () => oldVerContract.token_uri(tokenId),
      () => oldVerContract.tokenURI(tokenId),
      () => oldVerContract.uri(tokenId),
    ];
    const tokenUri = await attemptOperations(tokenUriOperations);

    if (!tokenUri) return null;

    return convertDataIntoString(tokenUri);
  }

  getReturnValuesEvent(
    txReceipt: GetTransactionReceiptResponse,
    chain: ChainDocument,
    timestamp: number,
  ): LogsReturnValues[] {
    const eventWithTypes: LogsReturnValues[] = [];
    const provider = this.getProvider(chain.rpc);

    if (txReceipt.isSuccess()) {
      for (const event of txReceipt.events) {
        const txReceiptFilter = {
          ...txReceipt,
          events: txReceipt.events.filter((ev) => ev == event),
        };
        if (event.keys.includes(EventTopic.TRANSFER)) {
          let returnValues: ERC721OrERC20TransferReturnValue = null;
          try {
            returnValues = decodeERC721OrERC20Transfer(
              txReceiptFilter,
              provider,
              timestamp,
            );
          } catch (error) {}

          if (returnValues) {
            const eventWithType: LogsReturnValues = {
              ...txReceiptFilter,
              eventType: returnValues.isKnownAsErc721
                ? EventType.TRANSFER_721
                : EventType.UNKNOWN_TRANSFER,
              returnValues,
            };

            if (returnValues.from === BURN_ADDRESS) {
              eventWithType.eventType = returnValues.isKnownAsErc721
                ? EventType.MINT_721
                : EventType.UNKNOWN_MINT;
            }
            if (returnValues.to === BURN_ADDRESS) {
              eventWithType.eventType = returnValues.isKnownAsErc721
                ? EventType.BURN_721
                : EventType.UNKNOWN_BURN;
            }

            if (returnValues.to !== SEQUENCER_ADDRESS) {
              eventWithTypes.push(eventWithType);
            }
          }
        } else if (event.keys.includes(EventTopic.TRANSFER_SINGLE)) {
          let returnValues: ERC1155TransferReturnValue = null;
          try {
            returnValues = decodeERC115Transfer(
              txReceiptFilter,
              provider,
              timestamp,
            );
          } catch (error) {}

          if (returnValues) {
            const eventWithType: LogsReturnValues = {
              ...txReceiptFilter,
              eventType: EventType.TRANSFER_1155,
              returnValues,
            };

            if (returnValues.from === BURN_ADDRESS) {
              eventWithType.eventType = EventType.MINT_1155;
            }
            if (returnValues.to === BURN_ADDRESS) {
              eventWithType.eventType = EventType.BURN_1155;
            }
            eventWithTypes.push(eventWithType);
          }
        } else if (event.keys.includes(EventTopic.TRANSFER_BATCH)) {
          let returnValues: ERC1155TransferReturnValue[] = [];
          try {
            returnValues = decodeERC115TransferBatch(
              txReceiptFilter,
              provider,
              timestamp,
            );
          } catch (error) {}

          if (returnValues.length > 0) {
            for (const value of returnValues) {
              const eventWithType: LogsReturnValues = {
                ...txReceiptFilter,
                eventType: EventType.TRANSFER_1155,
                returnValues: value,
              };

              if (value.from === BURN_ADDRESS) {
                eventWithType.eventType = EventType.MINT_1155;
              }
              if (value.to === BURN_ADDRESS) {
                eventWithType.eventType = EventType.BURN_1155;
              }
              eventWithTypes.push(eventWithType);
            }
          }
        }
      }
    }

    return eventWithTypes;
  }
}
