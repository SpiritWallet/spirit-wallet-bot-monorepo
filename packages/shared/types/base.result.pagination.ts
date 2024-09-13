// SPDX-License-Identifier: MIT

import { PaginationDto } from './pagination.dto';

export class BaseResultPagination<T> {
  errors?: Record<string, string[]>;
  data?: PaginationDto<T>;
  success? = true;
}
