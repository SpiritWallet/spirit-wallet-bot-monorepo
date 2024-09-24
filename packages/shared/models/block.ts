// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BlockWorkerStatus, TransactionWorkerType } from '../types';

export type BlockDocument = Blocks & Document;

@Schema()
export class Blocks {
  @Prop({ index: true })
  blockNumber: number;

  @Prop({ index: true })
  chain: string;

  @Prop()
  transactions: TransactionWorkerType[];

  @Prop()
  status: BlockWorkerStatus;

  @Prop()
  timestamp: number;
}

export const BlockSchema = SchemaFactory.createForClass(Blocks);
