// SPDX-License-Identifier: MIT

export class BaseResult<T> {
  error?: string;

  data?: T;

  success = true;

  constructor(data: T) {
    this.data = data;
    this.success = true;
  }
}
