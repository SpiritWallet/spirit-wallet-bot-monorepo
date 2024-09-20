// SPDX-License-Identifier: MIT

import {
  ChainDocument,
  Chains,
  Erc20BalanceDocument,
  Erc20Balances,
} from '@app/shared/models';
import { Injectable } from '@nestjs/common';
import { Provider, Contract, Account, CallData } from 'starknet';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getPubKey } from '@app/shared/utils';

@Injectable()
export class Web3Service {
  constructor(
    @InjectModel(Chains.name)
    private readonly chainModel: Model<ChainDocument>,
    @InjectModel(Erc20Balances.name)
    private readonly erc20BalanceModel: Model<Erc20BalanceDocument>,
  ) {}

  async getProvider(rpc?: string) {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpc;
    }
    const provider = new Provider({ nodeUrl: rpc });
    return provider;
  }

  async getBlockTime(rpc?: string) {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpc;
    }
    const provider = await this.getProvider(rpc);
    const block = await provider.getBlock('pending');
    return block.timestamp * 1e3;
  }

  async getContractInstance(
    abi: any,
    contractAddress: string,
    rpc?: string,
  ): Promise<Contract> {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpc;
    }
    const provider = await this.getProvider(rpc);
    const contractInstance = new Contract(abi, contractAddress, provider);
    return contractInstance;
  }

  async getAccountInstance(address: string, privateKey: string, rpc?: string) {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpc;
    }
    const provider = await this.getProvider(rpc);
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
    const provider = await this.getProvider(rpc);
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

  async awaitTransaction(
    txHash: string,
    rpc?: string,
  ): Promise<{ isSuccess: boolean }> {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpc;
    }
    const provider = await this.getProvider(rpc);
    let isFinished = false;
    let isSuccess = false;
    while (!isFinished) {
      const tx = await provider.getTransactionReceipt(txHash);
      if (tx) {
        if (tx.isSuccess()) {
          isSuccess = true;
        }

        isFinished = true;
      }
    }

    return { isSuccess };
  }
}
