// SPDX-License-Identifier: MIT

import { shortenAddress } from '../utils';
import { formatUnits } from 'ethers';
import TelegramBot from 'node-telegram-bot-api';

export async function sendErc20MintedMessage(
  bot: TelegramBot,
  chatId: number,
  walletAddress: string,
  contractSymbol: string,
  value: string,
  decimals: number,
  txHash: string,
) {
  const message = `Your wallet ${'`'}${walletAddress}${'`'} minted ${formatUnits(value, decimals)} $${contractSymbol}\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

export async function sendErc20BurnedMessage(
  bot: TelegramBot,
  chatId: number,
  walletAddress: string,
  contractSymbol: string,
  value: string,
  decimals: number,
  txHash: string,
) {
  const message = `Your wallet ${'`'}${walletAddress}${'`'} burned ${formatUnits(value, decimals)} $${contractSymbol}\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

export async function sendErc20TransferedMessage(
  bot: TelegramBot,
  chatId: number,
  walletAddress: string,
  isReceiver: boolean,
  otherWalletAddress: string,
  contractSymbol: string,
  value: string,
  decimals: number,
  txHash: string,
) {
  const message = `Your wallet ${'`'}${walletAddress}${'`'} ${isReceiver ? 'received' : 'sent'} ${formatUnits(value, decimals)} $${contractSymbol} ${isReceiver ? 'from' : 'to'} ${'`'}${otherWalletAddress}${'`'}.\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

export async function sendNftMintedMessage(
  bot: TelegramBot,
  chatId: number,
  walletAddress: string,
  contractSymbol: string,
  tokenId: string,
  amount: string,
  txHash: string,
) {
  const message = `Your wallet ${'`'}${walletAddress}${'`'} minted ${amount} NFT #${contractSymbol} with tokenId ${tokenId}\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

export async function sendNftBurnedMessage(
  bot: TelegramBot,
  chatId: number,
  walletAddress: string,
  contractSymbol: string,
  tokenId: string,
  amount: string,
  txHash: string,
) {
  const message = `Your wallet ${'`'}${walletAddress}${'`'} burned ${amount} NFT #${contractSymbol} with tokenId ${tokenId}\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

export async function sendNftTransferedMessage(
  bot: TelegramBot,
  chatId: number,
  walletAddress: string,
  isReceiver: boolean,
  otherWalletAddress: string,
  contractSymbol: string,
  tokenId: string,
  amount: string,
  txHash: string,
) {
  const message = `Your wallet ${'`'}${walletAddress}${'`'} ${isReceiver ? 'received' : 'sent'} ${amount} NFT #${contractSymbol} with tokenId ${tokenId} ${isReceiver ? 'from' : 'to'} ${'`'}${otherWalletAddress}${'`'}.\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}
