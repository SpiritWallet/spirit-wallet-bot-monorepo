// SPDX-License-Identifier: MIT

import configuration from '@app/shared/configuration';
import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import {
  decodeAddress,
  encryptSeedPhrase,
  generateSeedPhrase,
  getWalletAddress,
  hashPassword,
  isValidPassword,
} from './utils';
import {
  classifyWalletFunction,
  sendAlreadyCreatedWalletMessage,
  sendInvalidPasswordMessage,
  sendNewWalletMessage,
  sendNoWalletMessage,
  sendPortfolioMessage,
  sendStartMessage,
  sendWalletFunctionMessage,
  sendWalletListMessage,
} from './utils/messages';
import { RedisService } from '../redis/redis.service';
import { BotCommand, UserState } from '@app/shared/types';
import {
  ChainDocument,
  Chains,
  Erc20BalanceDocument,
  Erc20Balances,
  NftBalanceDocument,
  UserDocument,
  Users,
  WalletDocument,
  Wallets,
} from '@app/shared/models';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  COMMAND_CALLBACK_DATA_PREFIXS,
  COMMON_CONTRACT_ADDRESS,
  PORTFOLIO_CALLBACK_DATA_PREFIXS,
  SPECIAL_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
} from '@app/shared/constants';
import { PortfolioService } from '../portfolio/portfolio.service';
import { Erc20BalancesDto } from '@app/shared/dto';

@Injectable()
export class BotService {
  private bot: TelegramBot;

  constructor(
    @InjectModel(Users.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Chains.name) private readonly chainModel: Model<ChainDocument>,
    @InjectModel(Wallets.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Erc20Balances.name)
    private readonly erc20BalanceModel: Model<Erc20BalanceDocument>,
    private readonly redisService: RedisService,
    private readonly portfolioService: PortfolioService,
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

    // handle '/mywallets' command
    this.bot.onText(/\/mywallets/, async (msg) => {
      await this.handleManageWalletsCommand(msg);
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

    this.bot.on('callback_query', async (callbackQuery) => {
      const data = callbackQuery.data;

      // send wallet's functions message
      if (
        data.startsWith(COMMAND_CALLBACK_DATA_PREFIXS.MY_WALLETS) ||
        data.startsWith(TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS)
      ) {
        sendWalletFunctionMessage(this.bot, callbackQuery);
      }

      // send message of specific function
      if (data.startsWith(SPECIAL_PREFIXS.FUNCTION)) {
        classifyWalletFunction(this.bot, callbackQuery);
      }

      // execute portfolio function
      if (data.startsWith(SPECIAL_PREFIXS.PORTFOLIO)) {
        const [fnPrefix, functionName, encodedAddress] = data.split('_');
        const combinedPrefix = fnPrefix + '_' + functionName + '_';

        let balances: Erc20BalancesDto[] = [];
        switch (combinedPrefix) {
          case PORTFOLIO_CALLBACK_DATA_PREFIXS.ERC20_TOKENS:
            balances = await this.portfolioService.getWalletErc20Balances(
              decodeAddress(encodedAddress),
            );
            break;
          case PORTFOLIO_CALLBACK_DATA_PREFIXS.NFT:
            break;
        }
        await sendPortfolioMessage(this.bot, callbackQuery, balances);
      }

      if (data === TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLETS) {
        await this.handleManageWalletsCommand(
          callbackQuery.message,
          callbackQuery.message.message_id,
        );
      }
    });
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
    const walletDocument = await this.walletModel.create(parentWallet);

    // create new erc20 balance with ETH and STRK
    const erc20Balances: Erc20Balances[] = [
      {
        wallet: walletDocument,
        chain: chainDocument,
        contractAddress: COMMON_CONTRACT_ADDRESS.ETH,
        amount: '0',
      },
      {
        wallet: walletDocument,
        chain: chainDocument,
        contractAddress: COMMON_CONTRACT_ADDRESS.STRK,
        amount: '0',
      },
    ];
    await this.erc20BalanceModel.insertMany(erc20Balances);
    sendNewWalletMessage(this.bot, msg, seedPhrase, address);
  }

  private async handleManageWalletsCommand(
    msg: TelegramBot.Message,
    msgId?: number,
  ) {
    const user = await this.userModel.findOne({ chatId: msg.chat.id });
    if (!user) {
      sendNoWalletMessage(this.bot, msg);
      return;
    }
    const wallets = await this.walletModel.find({
      chatId: user,
    });

    if (wallets.length === 0) {
      sendNoWalletMessage(this.bot, msg);
      return;
    }

    // send message with list of wallets
    sendWalletListMessage(this.bot, msg, wallets, msgId);
  }
}
