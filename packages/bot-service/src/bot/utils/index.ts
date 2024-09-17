// SPDX-License-Identifier: MIT

export * from './wallet';

export function encodeAddress(address: string) {
  const hexString = address.replace('0x', '');
  return Buffer.from(hexString, 'hex').toString('base64');
}

export function decodeAddress(encodedAddress: string) {
  const buffer = Buffer.from(encodedAddress, 'base64');
  return '0x' + buffer.toString('hex');
}
