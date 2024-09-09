// SPDX-License-Identifier: MIT

import configuration from '@app/shared/configuration';
import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { HDNodeWallet } from 'ethers';
import { computeAddressFromMnemonic, getStarkPk } from './utils';
import { ACCOUNT_CLASS_HASH } from '@app/shared/constants';
import { formattedContractAddress } from '@app/shared/utils';

@Injectable()
export class BotService {
  bot: TelegramBot = new TelegramBot(configuration().TELEGRAM_BOT_TOKEN, {
    polling: true,
  });
  constructor() {
    this.start();
  }

  start() {
    this.bot.on('message', (msg) => {
      if (msg.text === '/start') {
        this.bot.sendMessage(
          msg.chat.id,
          `Welcome @${msg.from.username} to Spirit Wallet, your trusted blockchain wallet for managing your digital assets on the Starknet network! 🎉\n\nWith Spirit Wallet, you can seamlessly manage your ERC-20, ERC-721, and ERC-1155 tokens all in one place. Whether you're sending, receiving, or securely storing your assets, our wallet ensures you have complete control over your digital portfolio.\n\nStart exploring the decentralized world with Spirit Wallet now by typing /newwallet! 🚀\n\nIf you need any help, just type /help to get started.`,
        );
      }

      if (msg.text === '/newwallet') {
        const seedPhrase = this.generateSeedPhrase();
        const address = this.getWalletAddress(seedPhrase, 0);

        this.bot.sendMessage(
          msg.chat.id,
          `Your seed phrase is:\n\n${'`'}${seedPhrase}${'`'}\n\nPlease keep it safe and secure. Don't share it with anyone. If you lose it, you will lose access to your wallet and all your assets.\n\nHere is your wallet address ${'`'}${formattedContractAddress(address)}${'`'}.\n\nWe hope you enjoy using Spirit Wallet! 💖`,
          { parse_mode: 'Markdown' },
        );
      }
    });
  }

  private generateSeedPhrase(): string {
    const mnemonic = HDNodeWallet.createRandom().mnemonic.phrase;
    return mnemonic;
  }

  private getWalletAddress(seedPhrase: string, index: number): string {
    return computeAddressFromMnemonic(seedPhrase, ACCOUNT_CLASS_HASH, index);
  }
}
