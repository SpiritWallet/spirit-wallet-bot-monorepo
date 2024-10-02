// SPDX-License-Identifier: MIT

import TelegramBot from 'node-telegram-bot-api';
import {
  BULK_TRANSFER_CALLBACK_DATA_PREFIXS,
  CONFIRM_TRANSACTION_CALLBACK_DATA_PREFIXS,
  FUNCTIONS_CALLBACK_DATA_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
  VIEW_TOKEN_CALLBACK_DATA_PREFIXS,
} from '../constants';
import { Erc20BalancesDto, NftBalancesDto } from '../dto';
import { decodeAddress, encodeAddress } from '../utils';
import { inlineBalancesKeyboard } from './manageWallets';
import { ContractStandard } from '../types';

export const inlineBulkTransferKeyboard = (encodedAddress: string) => {
  return {
    inline_keyboard: [
      [
        {
          text: 'ERC20',
          callback_data:
            BULK_TRANSFER_CALLBACK_DATA_PREFIXS.ERC20 + encodedAddress,
        },
        {
          text: 'NFT',
          callback_data:
            BULK_TRANSFER_CALLBACK_DATA_PREFIXS.NFT + encodedAddress,
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

export function inlineBulkTransferReviewKeyboard(encodedAddress: string) {
  return {
    inline_keyboard: [
      [
        {
          text: 'Add Section',
          callback_data:
            BULK_TRANSFER_CALLBACK_DATA_PREFIXS.ADD_NEW_SECTION +
            encodedAddress,
        },
        {
          text: 'Finish',
          callback_data:
            BULK_TRANSFER_CALLBACK_DATA_PREFIXS.FINISH_ADD_SECTION +
            encodedAddress,
        },
      ],
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

export function sendNewBulkTransferMessage(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
) {
  const message = `Select asset to continue`;
  const encodedAddress = callbackQuery.data
    .replace(FUNCTIONS_CALLBACK_DATA_PREFIXS.BULK_TRANSFER, '')
    .replace(BULK_TRANSFER_CALLBACK_DATA_PREFIXS.ADD_NEW_SECTION, '');

  bot.editMessageText(message, {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    parse_mode: 'Markdown',
    reply_markup: inlineBulkTransferKeyboard(encodedAddress),
  });
}

export function sendReviewBulkTransfer(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  context: string,
) {
  const transactionDetail = JSON.parse(context);
  const { userDocument, wallet, currentIndex, sectionDetail } =
    transactionDetail;

  let message = `Bulk Transfer Review\n`;

  for (const section of sectionDetail) {
    const { contractDetail, amount, receiver } = section;
    switch (contractDetail.standard) {
      case ContractStandard.ERC20:
        message += `\n${amount} $${contractDetail.symbol} to ${receiver}\n`;
        break;
      case ContractStandard.ERC721:
      case ContractStandard.ERC1155:
        message += `\n${amount} #TokenId ${section.tokenId} of ${contractDetail.name} to ${receiver}\n`;
        break;
    }
  }

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: inlineBulkTransferReviewKeyboard(
      encodeAddress(wallet.address),
    ),
  });
}
