// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseModel } from './base';
import { ChainDocument } from './chain';
import { WalletDocument } from './wallet';

export type Erc20BalanceDocument = Erc20Balances & Document;

@Schema()
export class Erc20Balances extends BaseModel {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chains', required: true })
  chain: ChainDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Wallets', required: true })
  wallet: WalletDocument;

  @Prop({ required: true })
  contractAddress: string;

  @Prop({ required: true })
  amount: string;
}

export const Erc20BalanceSchema = SchemaFactory.createForClass(Erc20Balances);
Erc20BalanceSchema.index({ wallet: 1, contractAddress: 1 }, { unique: true });
