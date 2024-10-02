// SPDX-License-Identifier: MIT

import TelegramBot from 'node-telegram-bot-api';
import { Erc20BalancesDto, NftBalancesDto } from '../dto';
import { WalletDocument } from '../models';
import {
  CONFIRM_TRANSACTION_CALLBACK_DATA_PREFIXS,
  TRANSFER_CALLBACK_DATA_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
} from '../constants';
import { encodeAddress } from '../utils';
import { formatUnits } from 'ethers';
import { ContractStandard } from '../types';

export const inlineErc20DetailKeyboard = (
  encodedAddress: string,
  encodedContractAddress: string,
  walletIndex: number,
) => {
  return {
    inline_keyboard: [
      [
        {
          text: 'Transfer',
          callback_data:
            TRANSFER_CALLBACK_DATA_PREFIXS.ERC20 +
            encodedContractAddress +
            '_' +
            walletIndex,
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

export const inlineNftDetailKeyboard = (
  encodedAddress: string,
  encodedContractAddress: string,
  tokenId: string,
  walletIndex: number,
) => {
  return {
    inline_keyboard: [
      [
        {
          text: 'Transfer',
          callback_data:
            TRANSFER_CALLBACK_DATA_PREFIXS.NFT +
            encodedContractAddress +
            '_' +
            walletIndex +
            '_' +
            tokenId,
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

export const inlineConfirmTransactionKeyboard = (
  encodedAddress: string,
  estimatedFee: string,
) => {
  return {
    inline_keyboard: [
      [
        {
          text: `Confirm Transaction (${formatUnits(estimatedFee, 18)} $ETH)`,
          callback_data: CONFIRM_TRANSACTION_CALLBACK_DATA_PREFIXS,
        },
      ],
      [
        {
          text: 'Cancel',
          callback_data:
            TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS +
            encodedAddress,
        },
      ],
    ],
  };
};

export function sendErc20DetailMessage(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
  walletDocument: WalletDocument,
  balance: Erc20BalancesDto,
) {
  const message = `${formatUnits(balance.amount, balance.contractDetail.decimals)} $${balance.contractDetail.symbol} ~ 0 $USD`;

  bot.editMessageText(message, {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    parse_mode: 'Markdown',
    reply_markup: inlineErc20DetailKeyboard(
      encodeAddress(walletDocument.address),
      encodeAddress(balance.contractAddress),
      walletDocument.index,
    ),
  });
}

export function sendNftDetailMessage(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery,
  walletDocument: WalletDocument,
  balance: NftBalancesDto,
) {
  const message = `${balance.amount} ${balance.nftDetail.name ? balance.nftDetail.name : `${balance.contractDetail.name}#${balance.tokenId}`} (#TokenId ${balance.tokenId}) of [${balance.contractDetail.name}](https://starkscan.co/nft-contract/${balance.contractAddress}) collection`;

  bot.editMessageText(message, {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    parse_mode: 'Markdown',
    reply_markup: inlineNftDetailKeyboard(
      encodeAddress(walletDocument.address),
      encodeAddress(balance.contractAddress),
      balance.tokenId,
      walletDocument.index,
    ),
    disable_web_page_preview: true,
  });
}

export function sendRequireErc20ReceiverMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Please enter the address of the receiver:
  \n\n`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}

export function sendRequireErc20AmountMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Please enter the amount of the tokens want to transfer:
  \n\n`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}

export function sendRequireNftReceiverMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Please enter the address of the receiver:
  \n\n`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}

export function sendConfirmTransactionMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  context: string,
  estimatedFee: string,
) {
  const transferDetail = JSON.parse(context);
  const { sectionDetail } = transferDetail;
  let message = `Review the transaction details below\n`;
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
    reply_markup: inlineConfirmTransactionKeyboard(
      encodeAddress(transferDetail.wallet.address),
      estimatedFee,
    ),
  });
}
