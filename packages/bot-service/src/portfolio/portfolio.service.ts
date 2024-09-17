// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContractDetailDocument,
  Erc20BalanceDocument,
  Erc20Balances,
  WalletDocument,
  Wallets,
} from '@app/shared/models';
import { COMMON_CONTRACT_ADDRESS } from '@app/shared/constants';
import { Erc20BalancesDto } from '@app/shared/dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Wallets.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Erc20Balances.name)
    private readonly erc20BalanceModel: Model<Erc20BalanceDocument>,
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
}
