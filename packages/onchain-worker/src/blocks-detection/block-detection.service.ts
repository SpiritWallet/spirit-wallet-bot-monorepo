// SPDX-License-Identifier: MIT

import { Model } from 'mongoose';
import { OnchainWorker } from '../onchainWorker';
import { BlockStatus, GetBlockResponse, Provider, RpcProvider } from 'starknet';
import { arraySliceProcess } from '@app/shared/utils/arrayLimitProcess';
import {
  BlockWorkerStatus,
  ContractStandard,
  EventType,
  LogsReturnValues,
  ONCHAIN_JOBS,
  TransactionWorkerStatus,
  TransactionWorkerType,
  retryUntil,
} from '@app/shared';
import { Queue } from 'bull';
import * as _ from 'lodash';
import configuration from '@app/shared/configuration';
import { BlockDocument, ChainDocument } from '@app/shared/models';
import { Web3Service } from '@app/web3/web3.service';
import { OnchainQueueService } from '@app/shared/onchainQueue.service';
import { ERC721OrERC20TransferReturnValue } from '@app/web3/decodeEvent';

export class BlockDetectionService extends OnchainWorker {
  constructor(
    erc20BurnQueue: Queue<LogsReturnValues>,
    erc20MintQueue: Queue<LogsReturnValues>,
    erc20TransferQueue: Queue<LogsReturnValues>,
    erc721BurnQueue: Queue<LogsReturnValues>,
    erc721MintQueue: Queue<LogsReturnValues>,
    erc721TransferQueue: Queue<LogsReturnValues>,
    erc1155BurnQueue: Queue<LogsReturnValues>,
    erc1155MintQueue: Queue<LogsReturnValues>,
    erc1155TransferQueue: Queue<LogsReturnValues>,
    onchainQueue: OnchainQueueService,
    blockModel: Model<BlockDocument>,
    web3Service: Web3Service,
    chain: ChainDocument,
  ) {
    super(1000, 10, `${BlockDetectionService.name}:${chain.name}`);
    this.logger.log('Created');
    this.web3Service = web3Service;
    this.erc20BurnQueue = erc20BurnQueue;
    this.erc20MintQueue = erc20MintQueue;
    this.erc20TransferQueue = erc20TransferQueue;
    this.erc721BurnQueue = erc721BurnQueue;
    this.erc721MintQueue = erc721MintQueue;
    this.erc721TransferQueue = erc721TransferQueue;
    this.erc1155BurnQueue = erc1155BurnQueue;
    this.erc1155MintQueue = erc1155MintQueue;
    this.erc1155TransferQueue = erc1155TransferQueue;
    this.onchainQueue = onchainQueue;
    this.chain = chain;
    this.chainId = chain._id;
    this.blockModel = blockModel;
  }
  chainId: string;
  web3Service: Web3Service;
  onchainQueue: OnchainQueueService;
  provider: Provider;
  chain: ChainDocument;
  erc20BurnQueue: Queue<LogsReturnValues>;
  erc20MintQueue: Queue<LogsReturnValues>;
  erc20TransferQueue: Queue<LogsReturnValues>;
  erc721BurnQueue: Queue<LogsReturnValues>;
  erc721MintQueue: Queue<LogsReturnValues>;
  erc721TransferQueue: Queue<LogsReturnValues>;
  erc1155BurnQueue: Queue<LogsReturnValues>;
  erc1155MintQueue: Queue<LogsReturnValues>;
  erc1155TransferQueue: Queue<LogsReturnValues>;
  blockModel: Model<BlockDocument>;

  fetchLatestBlock: () => Promise<number> = async () => {
    const latestBlock = await this.provider.getBlock('latest');
    return latestBlock.block_number - Number(this.chain.delayBlock || 0);
  };

  init = async () => {
    const latestBlock = await this.blockModel
      .findOne({
        status: BlockWorkerStatus.SUCCESS,
      })
      .sort({ blockNumber: -1 });
    this.currentBlock =
      (latestBlock?.blockNumber || configuration().BEGIN_BLOCK - 1) + 1;
    this.provider = new RpcProvider({ nodeUrl: this.chain.rpc });
    this.logger.log(`chain: ${JSON.stringify(this.chain)}`);
  };

  fillBlockDataBuffer = async (
    blocks: (number | 'pending')[],
  ): Promise<{ [k: number]: GetBlockResponse }> => {
    const dataBlocks = await Promise.all(
      blocks.map(async (b) => this.provider.getBlock(b)),
    );

    const groupByBlock: { [k: number]: GetBlockResponse } = dataBlocks.reduce(
      (acc, cur) => {
        if (
          cur.status == BlockStatus.ACCEPTED_ON_L2 ||
          cur.status == BlockStatus.ACCEPTED_ON_L1
        ) {
          acc[cur.block_number] = cur;
          return acc;
        }

        if (cur.status == BlockStatus.PENDING) {
          acc[this.pendingBlock] = cur;
          return acc;
        }
      },
      {},
    );

    return groupByBlock;
  };

  process = async (block: GetBlockResponse): Promise<void> => {
    const beginTime = Date.now();
    let blockNumber =
      block.status == BlockStatus.ACCEPTED_ON_L2 ||
      block.status == BlockStatus.ACCEPTED_ON_L1
        ? block.block_number
        : this.pendingBlock;

    this.logger.debug(
      `begin process block ${Number(blockNumber)} ${
        block.transactions.length
      } txs`,
    );
    let transactionWorker: TransactionWorkerType[] = block.transactions.map(
      (tx) => {
        return { txHash: tx, status: TransactionWorkerStatus.PENDING };
      },
    );

    let blockEntity = await this.blockModel.findOne({
      blockNumber: blockNumber,
      chain: this.chainId,
    });

    if (!blockEntity) {
      //insert to db
      blockEntity = await this.blockModel.findOneAndUpdate(
        {
          blockNumber: blockNumber,
          chain: this.chainId,
        },
        {
          $setOnInsert: {
            blockNumber: blockNumber,
            chain: this.chainId,
            transactions: transactionWorker,
            status: BlockWorkerStatus.PENDING,
            timestamp: block.timestamp * 1e3,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );
    } else {
      transactionWorker = _.unionBy(
        blockEntity.transactions,
        transactionWorker,
        'txHash',
      );
    }

    const batchProcess = 100;
    const maxRetry = 10;
    //batch process 10 txs, max retry 10 times
    await arraySliceProcess(
      transactionWorker,
      async (txs) => {
        await Promise.all(
          txs.map(async (tx) => {
            await retryUntil(
              async () => this.processTx(tx, block.timestamp * 1e3),
              () => true,
              maxRetry,
            );
          }),
        );
      },
      batchProcess,
    );

    if (blockNumber !== this.pendingBlock) {
      blockEntity.status = BlockWorkerStatus.SUCCESS;
    }
    blockEntity.transactions = transactionWorker;
    await this.blockModel.findOneAndUpdate(
      { blockNumber: blockEntity.blockNumber },
      { $set: blockEntity },
      { upsert: true },
    );

    this.logger.debug(
      `end process block ${Number(blockNumber)} ${block.transactions.length}txs in ${
        Date.now() - beginTime
      }ms`,
    );
  };

  async processTx(tx: TransactionWorkerType, timestamp: number) {
    try {
      const { status, txHash } = tx;
      if (status == TransactionWorkerStatus.SUCCESS) {
        return tx;
      }

      const trasactionReceipt =
        await this.provider.getTransactionReceipt(txHash);
      if (!trasactionReceipt) {
        // throw new Error(`Can not get transaction receipt ${txHash}`);
        return undefined;
      }

      //parse event
      const eventWithType = this.web3Service.getReturnValuesEvent(
        trasactionReceipt,
        this.chain,
        timestamp,
      );

      //process event
      let index = 0;
      for (const event of eventWithType) {
        event.index = index;
        let queue: Queue<LogsReturnValues> = null;
        let jobName: string = null;
        switch (event.eventType) {
          case EventType.UNKNOWN_BURN:
          case EventType.UNKNOWN_MINT:
          case EventType.UNKNOWN_TRANSFER:
            const { contractAddress: contractAddressBurned } =
              event.returnValues as ERC721OrERC20TransferReturnValue;
            const contractStandard = await this.web3Service.getContractStandard(
              contractAddressBurned,
              this.chain.rpc,
            );
            if (!contractStandard) {
              break;
            }

            if (contractStandard === ContractStandard.ERC20) {
              queue =
                event.eventType === EventType.UNKNOWN_BURN
                  ? this.erc20BurnQueue
                  : event.eventType === EventType.UNKNOWN_MINT
                    ? this.erc20MintQueue
                    : this.erc20TransferQueue;
              jobName =
                event.eventType === EventType.UNKNOWN_BURN
                  ? ONCHAIN_JOBS.JOB_BURN_20
                  : event.eventType === EventType.UNKNOWN_MINT
                    ? ONCHAIN_JOBS.JOB_MINT_20
                    : ONCHAIN_JOBS.JOB_TRANSFER_20;
            } else {
              queue =
                event.eventType === EventType.UNKNOWN_BURN
                  ? this.erc721BurnQueue
                  : event.eventType === EventType.UNKNOWN_MINT
                    ? this.erc721MintQueue
                    : this.erc721TransferQueue;
              jobName =
                event.eventType === EventType.UNKNOWN_BURN
                  ? ONCHAIN_JOBS.JOB_BURN_721
                  : event.eventType === EventType.UNKNOWN_MINT
                    ? ONCHAIN_JOBS.JOB_MINT_721
                    : ONCHAIN_JOBS.JOB_TRANSFER_721;
            }
            break;
          case EventType.BURN_721:
            queue = this.erc721BurnQueue;
            jobName = ONCHAIN_JOBS.JOB_BURN_721;
            break;
          case EventType.MINT_721:
            queue = this.erc721MintQueue;
            jobName = ONCHAIN_JOBS.JOB_MINT_721;
            break;
          case EventType.TRANSFER_721:
            queue = this.erc721TransferQueue;
            jobName = ONCHAIN_JOBS.JOB_TRANSFER_721;
            break;
          case EventType.BURN_1155:
            queue = this.erc1155BurnQueue;
            jobName = ONCHAIN_JOBS.JOB_BURN_1155;
            break;
          case EventType.MINT_1155:
            queue = this.erc1155MintQueue;
            jobName = ONCHAIN_JOBS.JOB_MINT_1155;
            break;
          case EventType.TRANSFER_1155:
            queue = this.erc1155TransferQueue;
            jobName = ONCHAIN_JOBS.JOB_TRANSFER_1155;
            break;
        }

        if (queue && jobName) {
          await this.onchainQueue.add(queue, jobName, event);
        }
        index++;
      }

      tx.status = TransactionWorkerStatus.SUCCESS;
      return tx;
    } catch (error) {
      throw new Error(
        `get error when detect tx - ${tx.txHash} - error: ${error}`,
      );
    }
  }
}
