// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseModel } from './base';
import { ChainDocument } from './chain';
import { UserDocument } from './user';

export type WalletDocument = Wallets & Document;

@Schema()
export class Wallets extends BaseModel {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Users', required: true })
  chatId: UserDocument;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  index: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chains', required: true })
  chain: ChainDocument;

  @Prop({ default: false })
  isDeployed?: boolean;

  @Prop()
  deployTxHash?: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallets);
WalletSchema.index({ address: 1 }, { unique: true });
WalletSchema.index({ chatId: 1 });
