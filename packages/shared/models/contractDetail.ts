// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseModel } from './base';
import { ChainDocument } from './chain';
import { ContractStandard } from '@app/shared';

export type ContractDetailDocument = ContractDetails & Document;

@Schema()
export class ContractDetails extends BaseModel {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chains', required: true })
  chain: ChainDocument;

  @Prop({ required: true })
  address: string;

  @Prop({ enum: ContractStandard, required: true })
  standard: ContractStandard;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ default: 0 })
  decimals?: number;
}

export const ContractDetailSchema =
  SchemaFactory.createForClass(ContractDetails);
ContractDetailSchema.index({ address: 1 }, { unique: true });
