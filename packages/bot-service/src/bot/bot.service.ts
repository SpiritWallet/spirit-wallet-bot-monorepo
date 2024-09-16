// SPDX-License-Identifier: MIT

import configuration from '@app/shared/configuration';
import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import {
  encryptSeedPhrase,
  generateSeedPhrase,
  getWalletAddress,
  hashPassword,
  isValidPassword,
} from './utils';
import {
  sendAlreadyCreatedWalletMessage,
  sendInvalidPasswordMessage,
  sendNewWalletMessage,
  sendStartMessage,
} from './messages';
import { RedisService } from '../redis/redis.service';
import { BotCommand, UserState } from '@app/shared/types';
import {
  ChainDocument,
  Chains,
  UserDocument,
  Users,
  WalletDocument,
  Wallets,
} from '@app/shared/models';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BotService {
  private bot: TelegramBot;

  constructor(
    @InjectModel(Users.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Chains.name) private readonly chainModel: Model<ChainDocument>,
    @InjectModel(Wallets.name)
    private readonly walletModel: Model<WalletDocument>,
    private readonly redisService: RedisService,
  ) {
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
    // check if the user has already created a wallet
    const user = await this.userModel.findOne({ chatId: msg.chat.id });
    if (user) {
      sendAlreadyCreatedWalletMessage(this.bot, msg);
      return;
    }

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

    // encrypt the seed phrase
    const password = msg.text;
    const { encryptedSeedPhrase, iv, salt } = await encryptSeedPhrase(
      seedPhrase,
      password,
    );

    // hash the user's password
    const hashedPassword = await hashPassword(password);

    // create new user entity and save in db
    const chainDocument = await this.chainModel.findOne();
    const newUser: Users = {
      chatId: msg.chat.id,
      chain: chainDocument,
      seedPhrase: encryptedSeedPhrase,
      iv,
      salt,
      password: hashedPassword,
    };

    const newUserDocument = await this.userModel.create(newUser);

    // create new parrent wallet
    const parentWallet: Wallets = {
      chatId: newUserDocument,
      address: address,
      index: 0,
      chain: chainDocument,
      isDeployed: false,
    };
    await this.walletModel.create(parentWallet);
    sendNewWalletMessage(this.bot, msg, seedPhrase, address);
  }
}
