// SPDX-License-Identifier: MIT

export class PaginationDto<T> {
  public total: number;

  public page: number;

  public size: number;

  public pages: number;

  public hasNext: boolean;

  public hasPrevious: boolean;

  public items: T[];

  public constructor(...args: any[]) {
    if (args.length === 3) {
      this.total = args[0];
      this.page = args[1];
      this.size = args[2];
      this.items = [];
      this.pages =
        Number(args[0]) === 0 ? 0 : Math.ceil((1.0 * this.total) / this.size);
    }
    if (args.length === 4) {
      this.total = args[1];
      this.page = args[2];
      this.size = args[3];
      this.items = args[0];
      this.pages =
        Number(args[1]) === 0 ? 0 : Math.ceil((1.0 * this.total) / this.size);
    }
    this.hasNext = this.pages > this.page;
    this.hasPrevious = this.page > 1;
  }
}
