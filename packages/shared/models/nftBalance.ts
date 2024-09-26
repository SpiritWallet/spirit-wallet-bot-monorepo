// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseModel } from './base';
import { ChainDocument } from './chain';
import { WalletDocument } from './wallet';
import { NftDetailDocument } from './nftDetail';

export type NftBalanceDocument = NftBalances & Document;

@Schema({ timestamps: true })
export class NftBalances extends BaseModel {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chains', required: true })
  chain: ChainDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Wallets', required: true })
  wallet: WalletDocument;

  @Prop({ required: true })
  contractAddress: string;

  @Prop({ required: true })
  tokenId: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'NftDetails', required: true })
  nftDetail: NftDetailDocument;

  @Prop({ required: true })
  amount: string;

  @Prop()
  latestTimestamp: number;
}

export const NftBalanceSchema = SchemaFactory.createForClass(NftBalances);
NftBalanceSchema.index(
  { wallet: 1, contractAddress: 1, tokenId: 1 },
  {
    unique: true,
  },
);
