// SPDX-License-Identifier: MIT

import {
  ChainSchema,
  Chains,
  ContractDetailSchema,
  ContractDetails,
  Erc20BalanceSchema,
  Erc20Balances,
  NftBalanceSchema,
  NftBalances,
  NftDetailSchema,
  NftDetails,
  TransactionSchema,
  Transactions,
  WalletSchema,
  Wallets,
} from '@app/shared/models';
import {
  MQ_JOB_DEFAULT_CONFIG,
  ONCHAIN_QUEUES,
  QUEUE_METADATA,
} from '@app/shared/types';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Web3Service } from '@app/web3/web3.service';
import { DetectionSerivce } from '../detection.service';
import { ERC721TransferProcessor } from './processors';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chains.name, schema: ChainSchema },
      { name: Transactions.name, schema: TransactionSchema },
      { name: Wallets.name, schema: WalletSchema },
      { name: ContractDetails.name, schema: ContractDetailSchema },
      { name: NftBalances.name, schema: NftBalanceSchema },
      { name: NftDetails.name, schema: NftDetailSchema },
      { name: Erc20Balances.name, schema: Erc20BalanceSchema },
    ]),
    BullModule.registerQueue(
      {
        name: QUEUE_METADATA,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_TRANSFER_721,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
    ),
  ],
  providers: [DetectionSerivce, Web3Service, ERC721TransferProcessor],
})
export class Erc721TransferQueueModule {}
