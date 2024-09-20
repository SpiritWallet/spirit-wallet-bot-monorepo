// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseModel } from './base';
import { ChainDocument } from './chain';
import { WalletDocument } from './wallet';
import { TransactionStatus, TransactionType } from '@app/shared/types';

export type TransactionDocument = Transactions & Document;

@Schema({ timestamps: true })
export class Transactions extends BaseModel {
  @Prop({ required: true })
  hash: string;

  @Prop({ required: true })
  index: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chains', required: true })
  chain: ChainDocument;

  @Prop({ required: true })
  contractAddress: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Wallets' })
  from?: WalletDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Wallets' })
  to?: WalletDocument;

  @Prop({ required: true })
  amount: string;

  @Prop({ enum: TransactionStatus, required: true })
  status: TransactionStatus;

  @Prop({ required: true })
  entryPoint: string;

  @Prop({ enum: TransactionType, required: true })
  type: TransactionType;
}

export const TransactionSchema = SchemaFactory.createForClass(Transactions);
TransactionSchema.index(
  { hash: 1, index: 1 },
  {
    unique: true,
  },
);
