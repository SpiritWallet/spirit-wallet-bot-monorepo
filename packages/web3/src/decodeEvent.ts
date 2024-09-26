// SPDX-License-Identifier: MIT

import { BigNumberish, Contract, RpcProvider, num, uint256 } from 'starknet';
import { formattedContractAddress } from '@app/shared/utils';
import { ABIS } from './abi';
import { EventTopic } from '@app/shared/types';
export type ERC721OrERC20TransferReturnValue = {
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  timestamp: number;
  isKnownAsErc721: boolean;
};

export const decodeERC721OrERC20Transfer = (
  txReceipt: any,
  provider: RpcProvider,
  timestamp: number,
): ERC721OrERC20TransferReturnValue => {
  const contractAddress = formattedContractAddress(
    txReceipt.events[0].from_address,
  );

  try {
    const contractInstance = new Contract(
      ABIS.ERC20ABI,
      contractAddress,
      provider,
    );
    const parsedEvent = contractInstance.parseEvents(txReceipt)[0];
    const returnValue: ERC721OrERC20TransferReturnValue = {
      from: formattedContractAddress(
        num.toHex(parsedEvent.Transfer.from as BigNumberish),
      ),
      to: formattedContractAddress(
        num.toHex(parsedEvent.Transfer.to as BigNumberish),
      ),
      value: (parsedEvent.Transfer.value as bigint).toString(),
      contractAddress: contractAddress,
      timestamp,
      isKnownAsErc721: false,
    };

    return returnValue;
  } catch (error) {
    try {
      const oldVercontractInstance = new Contract(
        ABIS.OldErc721ABI,
        contractAddress,
        provider,
      );
      txReceipt.events[0].keys = [EventTopic.TRANSFER];
      const parsedEvent = oldVercontractInstance.parseEvents(txReceipt)[0];
      const returnValue: ERC721OrERC20TransferReturnValue = {
        from: formattedContractAddress(
          num.toHex(parsedEvent.Transfer.from as BigNumberish),
        ),
        to: formattedContractAddress(
          num.toHex(parsedEvent.Transfer.to as BigNumberish),
        ),
        value: (
          uint256.uint256ToBN(parsedEvent.Transfer.token_id as any) as bigint
        ).toString(),
        contractAddress,
        timestamp,
        isKnownAsErc721: true,
      };

      return returnValue;
    } catch (error) {
      return null;
    }
  }
};

export type ERC1155TransferReturnValue = {
  from: string;
  to: string;
  tokenId: string;
  nftAddress: string;
  value: string;
  timestamp: number;
};

export const decodeERC115Transfer = (
  txReceipt: any,
  provider: RpcProvider,
  timestamp: number,
): ERC1155TransferReturnValue => {
  const nftAddress = formattedContractAddress(txReceipt.events[0].from_address);
  try {
    const contractInstance = new Contract(
      ABIS.ERC1155ABI,
      nftAddress,
      provider,
    );

    const parsedEvent = contractInstance.parseEvents(txReceipt)[0];
    const returnValue: ERC1155TransferReturnValue = {
      from: formattedContractAddress(
        num.toHex(parsedEvent.TransferSingle.from as BigNumberish),
      ),
      to: formattedContractAddress(
        num.toHex(parsedEvent.TransferSingle.to as BigNumberish),
      ),
      tokenId: (parsedEvent.TransferSingle.id as bigint).toString(),
      nftAddress,
      timestamp,
      value: (parsedEvent.TransferSingle.value as bigint).toString(),
    };

    return returnValue;
  } catch (error) {
    try {
      const contractInstance = new Contract(
        ABIS.OldErc1155ABI,
        nftAddress,
        provider,
      );

      txReceipt.events[0].keys = [EventTopic.TRANSFER_SINGLE];
      const parsedEvent = contractInstance.parseEvents(txReceipt)[0];
      const returnValue: ERC1155TransferReturnValue = {
        from: formattedContractAddress(
          num.toHex(parsedEvent.TransferSingle.from as BigNumberish),
        ),
        to: formattedContractAddress(
          num.toHex(parsedEvent.TransferSingle.to as BigNumberish),
        ),
        tokenId: (parsedEvent.TransferSingle.id as bigint).toString(),
        nftAddress,
        timestamp,
        value: (parsedEvent.TransferSingle.value as bigint).toString(),
      };
      return returnValue;
    } catch (error) {
      throw new Error(error);
    }
  }
};

export const decodeERC115TransferBatch = (
  txReceipt: any,
  provider: RpcProvider,
  timestamp: number,
): ERC1155TransferReturnValue[] => {
  const returnValues: ERC1155TransferReturnValue[] = [];
  const nftAddress = formattedContractAddress(txReceipt.events[0].from_address);
  try {
    const contractInstance = new Contract(
      ABIS.ERC1155ABI,
      nftAddress,
      provider,
    );

    const parsedEvent = contractInstance.parseEvents(txReceipt)[0];
    const { from, to, ids, values } = parsedEvent.TransferBatch;
    const fromAddress = formattedContractAddress(
      num.toHex(from as BigNumberish),
    );
    const toAddress = formattedContractAddress(num.toHex(to as BigNumberish));
    for (let i = 0; i < (ids as BigNumberish[]).length; i++) {
      returnValues.push({
        from: fromAddress,
        to: toAddress,
        tokenId: (ids[i] as bigint).toString(),
        nftAddress,
        timestamp,
        value: (values[i] as bigint).toString(),
      });
    }

    return returnValues;
  } catch (error) {
    try {
      const contractInstance = new Contract(
        ABIS.OldErc1155ABI,
        nftAddress,
        provider,
      );

      txReceipt.events[0].keys = [EventTopic.TRANSFER_BATCH];
      const parsedEvent = contractInstance.parseEvents(txReceipt)[0];
      const { from, to, ids, values } = parsedEvent.TransferBatch;
      const fromAddress = formattedContractAddress(
        num.toHex(from as BigNumberish),
      );
      const toAddress = formattedContractAddress(num.toHex(to as BigNumberish));
      for (let i = 0; i < (ids as BigNumberish[]).length; i++) {
        returnValues.push({
          from: fromAddress,
          to: toAddress,
          tokenId: (ids[i] as bigint).toString(),
          nftAddress,
          timestamp,
          value: (values[i] as bigint).toString(),
        });
      }

      return returnValues;
    } catch (error) {
      throw new Error(error);
    }
  }
};
