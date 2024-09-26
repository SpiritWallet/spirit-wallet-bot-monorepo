// SPDX-License-Identifier: MIT

import { QUEUE_METADATA } from '@app/shared/types';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetadataService } from './metadata.service';
import { FetchMetadataProcessor } from './queue/fetch-metadata.processor';
import { Web3Service } from '@app/web3/web3.service';
import {
  ChainSchema,
  Chains,
  ContractDetailSchema,
  ContractDetails,
  NftDetailSchema,
  NftDetails,
} from '@app/shared/models';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_METADATA,
    }),
    MongooseModule.forFeature([
      { name: NftDetails.name, schema: NftDetailSchema },
      { name: ContractDetails.name, schema: ContractDetailSchema },
      { name: Chains.name, schema: ChainSchema },
    ]),
  ],
  providers: [MetadataService, FetchMetadataProcessor, Web3Service],
})
export class MetadataModule {}
