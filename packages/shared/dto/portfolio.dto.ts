// SPDX-License-Identifier: MIT

import { ContractDetailDto } from './contractDetail.dto';

export class Erc20BalancesDto {
  chain: string;
  wallet: string;
  contractAddress: string;
  amount: string;
  contractDetail: ContractDetailDto;
}

export class NftBalancesDto {
  chain: string;
  wallet: string;
  contractAddress: string;
  tokenId: string;
  nftDetail: NftDetailDto;
  amount: string;
  contractDetail: ContractDetailDto;
}

export class NftDetailDto {
  name: string;
  description: string;
  attributes: AttributeDto[];
  externalUrl: string;
  animationUrl: string;
  animationPlayType: string;
  image: string;
}

export class AttributeDto {
  traitType: string;
  value: string;
}
