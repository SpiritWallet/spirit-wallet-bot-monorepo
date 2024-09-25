// SPDX-License-Identifier: MIT

import { Controller } from '@nestjs/common';
import { BlockDetectionService } from './block-detection.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  BlockDocument,
  Blocks,
  ChainDocument,
  Chains,
} from '@app/shared/models';
import { Model } from 'mongoose';
import { LogsReturnValues, ONCHAIN_QUEUES } from '@app/shared/types';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { OnchainQueueService } from '@app/shared/onchainQueue.service';
import { Web3Service } from '@app/web3/web3.service';

@Controller('block-detection')
export class BlockDetectionController {
  constructor(
    @InjectModel(Chains.name)
    private readonly chainModel: Model<ChainDocument>,
    @InjectModel(Blocks.name)
    private readonly blockModel: Model<BlockDocument>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_BURN_20)
    private readonly burn20Queue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_MINT_20)
    private readonly mint20Queue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_TRANSFER_20)
    private readonly transfer20Queue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_BURN_721)
    private readonly erc721BurnQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_MINT_721)
    private readonly erc721MintQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_TRANSFER_721)
    private readonly erc721TransferQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_BURN_1155)
    private readonly erc1155BurnQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_MINT_1155)
    private readonly erc1155MintQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_TRANSFER_1155)
    private readonly erc1155TransferQueue: Queue<LogsReturnValues>,
    private readonly onchainQueueService: OnchainQueueService,
    private readonly web3Service: Web3Service,
  ) {
    if (!this.listeners) this.init();
  }
  listeners: BlockDetectionService[];

  async init() {
    const chains = await this.chainModel.find();
    this.listeners = chains
      .filter((chain) => chain._id)
      .map(
        (chain) =>
          new BlockDetectionService(
            this.burn20Queue,
            this.mint20Queue,
            this.transfer20Queue,
            this.erc721BurnQueue,
            this.erc721MintQueue,
            this.erc721TransferQueue,
            this.erc1155BurnQueue,
            this.erc1155MintQueue,
            this.erc1155TransferQueue,
            this.onchainQueueService,
            this.blockModel,
            this.web3Service,
            chain,
          ),
      );

    for (const job of this.listeners) {
      job.start();
    }
  }
}
