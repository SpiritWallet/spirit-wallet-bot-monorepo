// SPDX-License-Identifier: MIT

import { ethers, HDNodeWallet } from 'ethers';
import { grindKey, getStarkKey } from '@scure/starknet';
import { hash } from 'starknet';
import { ACCOUNT_CLASS_HASH, SALT_ROUND } from '@app/shared/constants';
import configuration from '@app/shared/configuration';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import argon2 from 'argon2';
import { formattedContractAddress } from '@app/shared/utils';

export const baseDerivationPath = "m/44'/9004'/0'/0";

export function getStarkPk(mnemonic: string, index: number) {
  const fullPath = getPathForIndex(index, baseDerivationPath);
  const masterNode = ethers.HDNodeWallet.fromPhrase(
    mnemonic,
    configuration().PHRASE_TO_PK_PWD,
    fullPath,
  );
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
    [starkKeyPub],
    0,
  );
}

export function generateSeedPhrase(): string {
  const mnemonic = HDNodeWallet.createRandom().mnemonic.phrase;
  return mnemonic;
}

export function validatePhrase(phrase: string) {
  try {
    HDNodeWallet.fromPhrase(phrase);
    return true;
  } catch (error) {
    return false;
  }
}

export function getWalletAddress(seedPhrase: string, index: number): string {
  return formattedContractAddress(
    computeAddressFromMnemonic(seedPhrase, ACCOUNT_CLASS_HASH, index),
  );
}

export function isValidPassword(password: string): boolean {
  const passwardRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwardRegex.test(password);
}

export async function encryptSeedPhrase(seedPhrase: string, password: string) {
  const salt = await bcrypt.genSalt(SALT_ROUND);

  const combinedPwd = password + configuration().ENCRYPT_SECRET_KEY;
  // Derive encryption key using PBKDF2 (Password-Based Key Derivation)
  const iv = crypto.randomBytes(16); // Initialization Vector
  const key = crypto.scryptSync(combinedPwd, salt, 32); // Derive 32-byte encryption key
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  // Encrypt the data
  let encryptedSeedPhrase = cipher.update(seedPhrase, 'utf8', 'hex');
  encryptedSeedPhrase += cipher.final('hex');
  return {
    encryptedSeedPhrase,
    iv: iv.toString('hex'),
    salt,
  };
}

export async function decryptWithPBEAndSecret(
  encryptedSeedPhrase: string,
  password: string,
  ivHex: string,
  salt: string,
) {
  // Combine password with the secret string (pepper)
  const combinedPwd = password + configuration().ENCRYPT_SECRET_KEY;

  // Derive decryption key using PBKDF2
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(combinedPwd, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  // Decrypt the data
  let decryptedData = decipher.update(encryptedSeedPhrase, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');

  return decryptedData;
}

export async function hashPassword(password: string) {
  return await argon2.hash(password);
}

export async function verifyPassword(password: string, hash: string) {
  return await argon2.verify(hash, password);
}
