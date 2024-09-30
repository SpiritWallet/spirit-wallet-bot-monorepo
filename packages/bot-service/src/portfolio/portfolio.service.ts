// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContractDetailDocument,
  Erc20BalanceDocument,
  Erc20Balances,
  NftBalanceDocument,
  NftBalances,
  WalletDocument,
  Wallets,
} from '@app/shared/models';
import { COMMON_CONTRACT_ADDRESS } from '@app/shared/constants';
import { Erc20BalancesDto, NftBalancesDto } from '@app/shared/dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Wallets.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Erc20Balances.name)
    private readonly erc20BalanceModel: Model<Erc20BalanceDocument>,
    @InjectModel(NftBalances.name)
    private readonly nftBalanceModel: Model<NftBalanceDocument>,
  ) {}

  async getWalletErc20Balances(address: string): Promise<Erc20BalancesDto[]> {
    const wallet = await this.walletModel.findOne({ address: address });

    if (!wallet) {
      return [];
    }

    const erc20Balances = await this.erc20BalanceModel.aggregate([
      {
        $match: {
          wallet: wallet._id,
          $or: [
            { contractAddress: COMMON_CONTRACT_ADDRESS.ETH },
            { contractAddress: COMMON_CONTRACT_ADDRESS.STRK },
            {
              $and: [
                { contractAddress: { $ne: COMMON_CONTRACT_ADDRESS.ETH } },
                { contractAddress: { $ne: COMMON_CONTRACT_ADDRESS.STRK } },
                { amount: { $ne: '0' } },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'contractdetails',
          localField: 'contractAddress',
          foreignField: 'address',
          as: 'contractDetail',
        },
      },
      {
        $unwind: {
          path: '$contractDetail',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $limit: 100,
      },
    ]);
    return erc20Balances;
  }

  async getWalletErc20Balance(
    address: string,
    contractAddress: string,
  ): Promise<Erc20BalancesDto> {
    const wallet = await this.walletModel.findOne({ address: address });

    if (!wallet) {
      return null;
    }

    const erc20Balance = await this.erc20BalanceModel.aggregate([
      {
        $match: {
          wallet: wallet._id,
          contractAddress: contractAddress,
        },
      },
      {
        $lookup: {
          from: 'contractdetails',
          localField: 'contractAddress',
          foreignField: 'address',
          as: 'contractDetail',
        },
      },
      {
        $unwind: {
          path: '$contractDetail',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $limit: 1,
      },
    ]);
    return erc20Balance[0];
  }

  async getWalletNftBalances(address: string): Promise<NftBalancesDto[]> {
    const wallet = await this.walletModel.findOne({ address: address });

    if (!wallet) {
      return [];
    }

    const nftBalances = await this.nftBalanceModel.aggregate([
      {
        $match: {
          wallet: wallet._id,
        },
      },
      {
        $lookup: {
          from: 'nftdetails',
          localField: 'nftDetail',
          foreignField: '_id',
          as: 'nftDetail',
        },
      },
      {
        $unwind: {
          path: '$nftDetail',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'contractdetails',
          localField: 'contractAddress',
          foreignField: 'address',
          as: 'contractDetail',
        },
      },
      {
        $unwind: {
          path: '$contractDetail',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $limit: 100,
      },
    ]);

    return nftBalances;
  }
}
