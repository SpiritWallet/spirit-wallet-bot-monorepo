// SPDX-License-Identifier: MIT

import {
  LogsReturnValues,
  ONCHAIN_JOBS,
  ONCHAIN_QUEUES,
} from '@app/shared/types';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DetectionSerivce } from '../../detection.service';
import { InjectModel } from '@nestjs/mongoose';
import { ChainDocument, Chains } from '@app/shared/models';
import { Model } from 'mongoose';
import { retryUntil } from '@app/shared/index';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor(ONCHAIN_QUEUES.QUEUE_MINT_721)
export class ERC721MintProcessor {
  constructor(
    private readonly detectionService: DetectionSerivce,
    @InjectModel(Chains.name) private readonly chainModel: Model<ChainDocument>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_MINT_721)
    private readonly queue: Queue<LogsReturnValues>,
  ) {}

  logger = new Logger(ERC721MintProcessor.name);

  @Process({ name: ONCHAIN_JOBS.JOB_MINT_721, concurrency: 100 })
  async detectEvent(job: Job<LogsReturnValues>) {
    const event = job.data;
    const maxRetry = 10;
    const chain = await this.chainModel.findOne();
    try {
      await retryUntil(
        async () =>
          await this.detectionService.processEvent(event, chain, event.index),
        () => true,
        maxRetry,
      );
    } catch (error) {
      this.logger.error(`Failed to detect tx hash ${event.transaction_hash}`);
      this.queue.add(ONCHAIN_JOBS.JOB_MINT_721, event);
    }
  }
}
