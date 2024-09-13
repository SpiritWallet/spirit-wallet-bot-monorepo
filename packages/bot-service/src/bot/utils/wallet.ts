// SPDX-License-Identifier: MIT

import { ethers, HDNodeWallet } from 'ethers';
import { grindKey, getStarkKey } from '@scure/starknet';
import { hash } from 'starknet';
import { ACCOUNT_CLASS_HASH } from '@app/shared/constants';

export const baseDerivationPath = "m/44'/9004'/0'/0";

export function getStarkPk(mnemonic: string, index: number) {
  const fullPath = getPathForIndex(index, baseDerivationPath);
  const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic, '', fullPath);
  const groundKey = grindKey(masterNode.privateKey);
  return getStarkKey(groundKey);
}

export function getPathForIndex(index: number, baseDerivationPath: string) {
  return `${baseDerivationPath}/${index}`;
}

export function computeAddressFromMnemonic(
  mnemonic: string,
  accountClassHash: string,
  index: number,
) {
  const starkPk = getStarkPk(mnemonic, index);
  return computeAddressFromPk(starkPk, accountClassHash);
}

export function getPubKey(pk: string) {
  return getStarkKey(pk);
}

export function computeAddressFromPk(pk: string, accountClassHash: string) {
  let starkKeyPub = getPubKey(pk);
  return hash.calculateContractAddressFromHash(
    starkKeyPub,
    BigInt(accountClassHash),
    [starkKeyPub, '0'],
    0,
  );
}

export function generateSeedPhrase(): string {
  const mnemonic = HDNodeWallet.createRandom().mnemonic.phrase;
  return mnemonic;
}

export function getWalletAddress(seedPhrase: string, index: number): string {
  return computeAddressFromMnemonic(seedPhrase, ACCOUNT_CLASS_HASH, index);
}

export function isValidPassword(password: string): boolean {
  const passwardRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwardRegex.test(password);
}
