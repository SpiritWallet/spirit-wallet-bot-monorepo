// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseModel } from './base';
import { ChainDocument } from './chain';

export type NftDetailDocument = NftDetails & Document;

@Schema({ timestamps: true })
export class NftDetails extends BaseModel {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chains', required: true })
  chain: ChainDocument;

  @Prop({ required: true })
  contractAddress: string;

  @Prop({ required: true })
  tokenId: string;

  @Prop()
  tokenURI?: string;

  @Prop()
  name?: string;

  @Prop()
  description?: string;

  @Prop()
  image?: string;
}

export const NftDetailSchema = SchemaFactory.createForClass(NftDetails);
NftDetailSchema.index(
  { contractAddress: 1, tokenId: 1 },
  {
    unique: true,
  },
);
