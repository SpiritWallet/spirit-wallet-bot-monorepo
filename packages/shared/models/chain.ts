// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseModel } from './base';

export type ChainDocument = Chains & Document;

@Schema()
export class Chains extends BaseModel {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  rpc: string;

  @Prop({ required: true })
  delayBlock: number;

  @Prop()
  walletClassHash: string;
}

export const ChainSchema = SchemaFactory.createForClass(Chains);
