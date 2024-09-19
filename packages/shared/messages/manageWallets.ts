// SPDX-License-Identifier: MIT

import {
  COMMAND_CALLBACK_DATA_PREFIXS,
  FUNCTIONS_CALLBACK_DATA_PREFIXS,
  PORTFOLIO_CALLBACK_DATA_PREFIXS,
  SECURITY_AND_PRIVACY_CALLBACK_DATA_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
} from '../constants';
import {
  Erc20BalanceDocument,
  NftBalanceDocument,
  WalletDocument,
} from '../models';

import TelegramBot from 'node-telegram-bot-api';
import { formatUnits } from 'ethers';
import { Erc20BalancesDto } from '../dto';
import { shortenAddress, encodeAddress, decodeAddress } from '../utils';

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
          text: 'Security & Privacy',
          callback_data:
            FUNCTIONS_CALLBACK_DATA_PREFIXS.SECURITY_AND_PRIVACY +
            encodedAddress,
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

export const inlineBalancesKeyboard = (encodedAddress: string) => {
  return {
    inline_keyboard: [
      [
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
          text: 'Back to Portfolio',
          callback_data:
            TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_PORTFOLIO + encodedAddress,
        },
      ],
    ],
  };
};

export const inlineSecurityAndPrivacyKeyboard = (encodedAddress: string) => {
  return {
    inline_keyboard: [
      [
        {
          text: 'Export Private Key',
          callback_data:
            SECURITY_AND_PRIVACY_CALLBACK_DATA_PREFIXS.EXPORT_PRIVATE_KEY +
            encodedAddress,
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

export function sendPortfolioMessage(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
) {
  const encodedAddress = callbackQuery.data
    .replace(TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_PORTFOLIO, '')
    .replace(FUNCTIONS_CALLBACK_DATA_PREFIXS.PORTFOLIO, '');

  bot.editMessageText('Which asset do you want to see?', {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    parse_mode: 'Markdown',
    reply_markup: inlinePortfolioKeyboard(encodedAddress),
  });
}

export async function sendBalanceMessage(
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
    reply_markup: inlineBalancesKeyboard(encodedAddress),
  });
}

export function sendExportSeedPhraseMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  seedPhrase: string,
) {
  const message = `Here is your seed phrase:
  \n${'`'}${seedPhrase}${'`'}
  \nPlease keep it safe and secure. Don't share it with anyone. If you lose it, you will lose access to your wallet and all your assets.
  \nThis message will be deleted automatically in 30 seconds.`;

  bot
    .sendMessage(msg.chat.id, message, {
      parse_mode: 'Markdown',
    })
    .then((sentMessage) => {
      // Delete the message after 30 seconds
      setTimeout(() => {
        bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
      }, 30000);
    });
}

export function sendPrivateKeyMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  privateKey: string,
) {
  const message = `Here is your private key of your wallet address:
  \n${'`'}${privateKey}${'`'}
  \n\nPlease keep it safe and secure. Don't share it with anyone. If you lose it, you will lose access to your wallet and all your assets.
  \nThis message will be deleted automatically in 30 seconds.`;

  bot
    .sendMessage(msg.chat.id, message, {
      parse_mode: 'Markdown',
    })
    .then((sentMessage) => {
      // Delete the message after 30 seconds
      setTimeout(() => {
        bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
      }, 30000);
    });
}

export function sendSecurityAndPrivacyMessage(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
) {
  const data = callbackQuery.data;
  const [, , encodedAddress] = data.split('_');

  bot.editMessageText('Security & Privacy', {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    parse_mode: 'Markdown',
    reply_markup: inlineSecurityAndPrivacyKeyboard(encodedAddress),
  });
}

export function sendAlreadyDeployedWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  txHash: string,
  encodedAddress: string,
) {
  const message = `You already have a deployed wallet!\n\nHere is your transaction hash: [${txHash}](https://sepolia.starkscan.co/tx/${txHash}).`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
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
    },
  });
}

export function sendDeployWalletSuccessMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  txHash: string,
  encodeAddress: string,
) {
  const message = `Your wallet has been successfully deployed!\n\nHere is your transaction hash: [${txHash}](https://sepolia.starkscan.co/tx/${txHash}).`;
  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Back to wallet functions',
            callback_data:
              TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS +
              encodeAddress,
          },
        ],
      ],
    },
  });
}
