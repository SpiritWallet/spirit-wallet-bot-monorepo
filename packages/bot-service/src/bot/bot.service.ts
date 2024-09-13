// SPDX-License-Identifier: MIT

import configuration from '@app/shared/configuration';
import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { formattedContractAddress } from '@app/shared/utils';
import { generateSeedPhrase, getWalletAddress, isValidPassword } from './utils';
import {
  sendInvalidPasswordMessage,
  sendNewWalletMessage,
  sendStartMessage,
} from './messages';
import { RedisService } from '../redis/redis.service';
import { BotCommand, UserState } from '@app/shared/types';

@Injectable()
export class BotService {
  private bot: TelegramBot;

  constructor(private readonly redisService: RedisService) {
    this.bot = new TelegramBot(configuration().TELEGRAM_BOT_TOKEN, {
      polling: true,
    });
    this.listenOnMessage();
  }

  listenOnMessage() {
    // handle '/start' command
    this.bot.onText(/\/start/, (msg) => {
      sendStartMessage(this.bot, msg);
    });

    // handle '/newwallet' command
    this.bot.onText(/\/newwallet/, async (msg) => {
      await this.handleAskPasswordCommand(msg);
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const message = msg.text;

      // if answer of the await password question?
      const state = await this.redisService.get(`user:${chatId}:state`);

      if (
        Object.values(BotCommand)
          .map((command) => command.toLowerCase())
          .includes(message.toLowerCase())
      ) {
        return;
      }

      if (state === UserState.AwaitingPassword) {
        // if user entered a password
        console.log(message);

        if (message) {
          // check if the password is valid
          if (!isValidPassword(message)) {
            // send a message to the user
            sendInvalidPasswordMessage(this.bot, msg);
            return;
          }

          // delete the state
          await this.redisService.del(`user:${chatId}:state`);
          // delete user's password message
          await this.bot.deleteMessage(msg.chat.id, msg.message_id);
          // send a message to the user
          this.handleNewWalletCommand(msg);
        }
      }
    });

    this.bot.on('polling_error', console.log);

    this.bot.on('callback_query', async (callbackQuery) => {});
  }

  private async handleAskPasswordCommand(msg: TelegramBot.Message) {
    this.bot.sendMessage(
      msg.chat.id,
      'Please provide a password to secure your wallet:',
    );

    // store user's state in redis
    await this.redisService.set(
      `user:${msg.from.id}:state`,
      UserState.AwaitingPassword,
    );
  }

  private async handleNewWalletCommand(msg: TelegramBot.Message) {
    const seedPhrase = generateSeedPhrase();
    const address = getWalletAddress(seedPhrase, 0);

    sendNewWalletMessage(this.bot, msg, seedPhrase, address);
  }
}
