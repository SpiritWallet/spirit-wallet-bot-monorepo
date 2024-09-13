// SPDX-License-Identifier: MIT

import {
  IsAlphanumeric,
  IsIn,
  IsOptional,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class BaseQueryParams {
  @Min(1)
  @IsOptional()
  page = 1;

  @Max(100)
  @Min(0)
  @IsOptional()
  size = 10;

  @IsAlphanumeric()
  @MaxLength(20)
  @IsOptional()
  orderBy: string;

  @IsOptional()
  @IsIn(['desc', 'asc'])
  desc?: string;

  public get skipIndex() {
    return this.size * (this.page - 1);
  }
  public get sort() {
    const orderBy = this.orderBy ?? 'createdAt';
    const order: any = [[orderBy, this.desc === 'asc' ? 1 : -1]];
    if (orderBy !== 'createdAt') {
      order.push(['createdAt', 1]);
    }
    return order;
  }

  toJSON() {
    return {
      page: this.page,
      size: this.size,
      orderBy: this.orderBy,
      desc: this.desc,
    };
  }
}
