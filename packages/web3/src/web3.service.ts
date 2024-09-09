// SPDX-License-Identifier: MIT

import { Injectable } from '@nestjs/common';
import { Provider, Contract } from 'starknet';

@Injectable()
export class Web3Service {
  getProvider(rpc: string) {
    const provider = new Provider({ nodeUrl: rpc });
    return provider;
  }
  async getBlockTime(rpc: string) {
    const provider = this.getProvider(rpc);
    const block = await provider.getBlock('pending');
    return block.timestamp * 1e3;
  }
  async getContractInstance(
    abi: any,
    contractAddress: string,
    rpc: string,
  ): Promise<Contract> {
    const provider = this.getProvider(rpc);
    const contractInstance = new Contract(abi, contractAddress, provider);
    return contractInstance;
  }
}
