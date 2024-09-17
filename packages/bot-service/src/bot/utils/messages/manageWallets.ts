// SPDX-License-Identifier: MIT

import {
  COMMAND_CALLBACK_DATA_PREFIXS,
  FUNCTIONS_CALLBACK_DATA_PREFIXS,
  PORTFOLIO_CALLBACK_DATA_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
} from '@app/shared/constants';
import {
  Erc20BalanceDocument,
  NftBalanceDocument,
  WalletDocument,
} from '@app/shared/models';
import { shortenAddress } from '@app/shared/utils';
import TelegramBot from 'node-telegram-bot-api';
import { decodeAddress, encodeAddress } from '..';
import { formatUnits } from 'ethers';
import { Erc20BalancesDto } from '@app/shared/dto';

export const inlineFunctionsKeyboard = (encodedAddress: string) => {
  return {
    inline_keyboard: [
      [
        {
          text: 'Deploy Wallet',
          callback_data:
            FUNCTIONS_CALLBACK_DATA_PREFIXS.DEPLOY_WALLET + encodedAddress,
        },
      ],
      [
        {
          text: 'Portfolio',
          callback_data:
            FUNCTIONS_CALLBACK_DATA_PREFIXS.PORTFOLIO + encodedAddress,
        },
        {
          text: 'Transfer',
          callback_data:
            FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER + encodedAddress,
        },
        {
          text: 'Bulk Transfer',
          callback_data:
            FUNCTIONS_CALLBACK_DATA_PREFIXS.BULK_TRANSFER + encodedAddress,
        },
      ],
      [
        {
          text: 'Back to Wallets',
          callback_data: TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLETS,
        },
      ],
    ],
  };
};

export const inlinePortfolioKeyboard = (encodedAddress: string) => {
  return {
    inline_keyboard: [
      [
        {
          text: 'ERC20',
          callback_data:
            PORTFOLIO_CALLBACK_DATA_PREFIXS.ERC20_TOKENS + encodedAddress,
        },
        {
          text: 'NFT',
          callback_data: PORTFOLIO_CALLBACK_DATA_PREFIXS.NFT + encodedAddress,
        },
      ],
      [
        {
          text: 'Back to Wallet Functions',
          callback_data:
            TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS +
            encodedAddress,
        },
      ],
    ],
  };
};

export function sendNoWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `You don't have any wallets yet!
  \nUse /newwallet to create a new wallet.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}

export function sendWalletListMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  wallets: WalletDocument[],
  msgId?: number,
) {
  const message = `Choose a wallet from the list below:
  \n\n`;

  const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [];
  let onlineWallet: TelegramBot.InlineKeyboardButton[] = [];
  for (const wallet of wallets) {
    if (onlineWallet.length === 5) {
      inlineKeyboard.push(onlineWallet);
      onlineWallet = [];
    }
    onlineWallet.push({
      text: shortenAddress(wallet.address),
      callback_data:
        COMMAND_CALLBACK_DATA_PREFIXS.MY_WALLETS +
        encodeAddress(wallet.address),
    });
  }
  if (onlineWallet.length > 0) {
    inlineKeyboard.push(onlineWallet);
  }

  if (msgId) {
    bot.editMessageText(message, {
      chat_id: msg.chat.id,
      message_id: msgId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
    return;
  }
  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  });
}

export function sendWalletFunctionMessage(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
) {
  const encodedAddress = callbackQuery.data
    .replace(COMMAND_CALLBACK_DATA_PREFIXS.MY_WALLETS, '')
    .replace(TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS, '');

  const address = decodeAddress(encodedAddress);
  const msg = callbackQuery.message;
  // edit message to option function keyboard
  const message = `Here is your wallet: ${'`'}${address}${'`'}.\nWhat do you want to do with your wallet?
  \n\n`;

  bot.editMessageText(message, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    parse_mode: 'Markdown',
    reply_markup: inlineFunctionsKeyboard(encodedAddress),
  });
}

export function classifyWalletFunction(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
) {
  const data = callbackQuery.data;
  const [fnPrefix, functionName, encodedAddress] = data.split('_');
  const combinedPrefix = fnPrefix + '_' + functionName + '_';

  switch (combinedPrefix) {
    case FUNCTIONS_CALLBACK_DATA_PREFIXS.DEPLOY_WALLET:
      break;
    case FUNCTIONS_CALLBACK_DATA_PREFIXS.PORTFOLIO:
      bot.editMessageText('Which asset do you want to see?', {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: inlinePortfolioKeyboard(encodedAddress),
      });
      break;
    case FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER:
      break;
    case FUNCTIONS_CALLBACK_DATA_PREFIXS.BULK_TRANSFER:
      break;
  }
}

export async function sendPortfolioMessage(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
  balances: Erc20BalancesDto[],
) {
  const [, , encodedAddress] = callbackQuery.data.split('_');
  const address = decodeAddress(encodedAddress);
  let baseMessage = `wallet address: ${'`'}${address}${'`'}.\n\nAsset List:\n`;
  for (const balance of balances) {
    baseMessage += `${balance.amount === '0' ? balance.amount : formatUnits(balance.amount, balance.contractDetail.decimals)} $${balance.contractDetail.symbol}\n`;
  }

  bot.editMessageText(baseMessage, {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    parse_mode: 'Markdown',
  });
}
