// SPDX-License-Identifier: MIT

import { ContractDetailDto } from './contractDetail.dto';

export class Erc20BalancesDto {
  chain: string;
  wallet: string;
  contractAddress: string;
  amount: string;
  contractDetail: ContractDetailDto;
}
