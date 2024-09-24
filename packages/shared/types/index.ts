// SPDX-License-Identifier: MIT

import { SuccessfulTransactionReceiptResponse } from 'starknet';
import { EventType, TransactionWorkerStatus } from './enum';

export * from './base.result';
export * from './base.queryparams';
export * from './base.result.pagination';
export * from './enum';
export * from './queue';

export const BURN_ADDRESS =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

export type TransactionWorkerType = {
  txHash: string;
  status: TransactionWorkerStatus;
};

export type LogsReturnValues = SuccessfulTransactionReceiptResponse & {
  returnValues: any;
  eventType: EventType;
  index?: number;
};
