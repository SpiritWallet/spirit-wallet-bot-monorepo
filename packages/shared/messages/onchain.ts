// SPDX-License-Identifier: MIT

import { decodeAddress, shortenAddress } from '../utils';
import { formatUnits } from 'ethers';
import TelegramBot from 'node-telegram-bot-api';
import { TURN_BACK_CALLBACK_DATA_KEYS } from '../constants';

export function inlineBackToWalletFunctionCallBackData(encodedAddress: string) {
  return {
    inline_keyboard: [
      [
        {
          text: 'Back to wallet functions',
          callback_data:
            TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS +
            encodedAddress,
        },
      ],
    ],
  };
}

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
    reply_markup: inlineBackToWalletFunctionCallBackData(
      decodeAddress(walletAddress),
    ),
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
    reply_markup: inlineBackToWalletFunctionCallBackData(
      decodeAddress(walletAddress),
    ),
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
    reply_markup: inlineBackToWalletFunctionCallBackData(
      decodeAddress(walletAddress),
    ),
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
  const message = `Your wallet ${'`'}${walletAddress}${'`'} minted ${amount} NFT #${contractSymbol} with #tokenId ${tokenId}\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: inlineBackToWalletFunctionCallBackData(
      decodeAddress(walletAddress),
    ),
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
  const message = `Your wallet ${'`'}${walletAddress}${'`'} burned ${amount} NFT #${contractSymbol} with #tokenId ${tokenId}\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: inlineBackToWalletFunctionCallBackData(
      decodeAddress(walletAddress),
    ),
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
  const message = `Your wallet ${'`'}${walletAddress}${'`'} ${isReceiver ? 'received' : 'sent'} ${amount} NFT #${contractSymbol} with #tokenId ${tokenId} ${isReceiver ? 'from' : 'to'} ${'`'}${otherWalletAddress}${'`'}.\n\n Transaction hash: [${shortenAddress(txHash)}](https://starkscan.co/tx/${txHash}).`;
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: inlineBackToWalletFunctionCallBackData(
      decodeAddress(walletAddress),
    ),
    disable_web_page_preview: true,
  });
}
