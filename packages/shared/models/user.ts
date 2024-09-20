// SPDX-License-Identifier: MIT

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseModel } from './base';
import { ChainDocument } from './chain';

export type UserDocument = Users & Document;

@Schema({ timestamps: true })
export class Users extends BaseModel {
  @Prop({ required: true })
  chatId: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chains', required: true })
  chain: ChainDocument;

  @Prop()
  seedPhrase: string; // encrypted

  @Prop()
  iv: string;

  @Prop()
  salt: string;

  @Prop()
  password: string; // hashed
}

export const UserSchema = SchemaFactory.createForClass(Users);
UserSchema.index({ chatId: 1 }, { unique: true });
