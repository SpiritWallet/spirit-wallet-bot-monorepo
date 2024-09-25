// SPDX-License-Identifier: MIT

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
import { ERC1155MintProcessor } from './processors';
import {
  Chains,
  ChainSchema,
  Transactions,
  TransactionSchema,
  Wallets,
  WalletSchema,
  ContractDetails,
  ContractDetailSchema,
  NftBalances,
  NftBalanceSchema,
} from '@app/shared/models';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chains.name, schema: ChainSchema },
      { name: Transactions.name, schema: TransactionSchema },
      { name: Wallets.name, schema: WalletSchema },
      { name: ContractDetails.name, schema: ContractDetailSchema },
      { name: NftBalances.name, schema: NftBalanceSchema },
    ]),
    BullModule.registerQueue(
      {
        name: QUEUE_METADATA,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_MINT_1155,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
    ),
  ],
  providers: [DetectionSerivce, Web3Service, ERC1155MintProcessor],
})
export class Erc1155MintQueueModule {}
