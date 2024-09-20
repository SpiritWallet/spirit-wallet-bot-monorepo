// SPDX-License-Identifier: MIT

import configuration from '@app/shared/configuration';
import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import {
  sendAlreadyCreatedWalletMessage,
  sendExportSeedPhraseMessage,
  sendInvalidPasswordMessage,
  sendNewWalletMessage,
  sendNoWalletMessage,
  sendPasswordMessage,
  sendBalanceMessage,
  sendRequirePasswordMessage,
  sendStartMessage,
  sendWalletFunctionMessage,
  sendWalletListMessage,
  sendWrongPasswordMessage,
  sendPortfolioMessage,
  sendPrivateKeyMessage,
  sendErrorMessage,
  sendOptiontoCreateNewWalletMessage,
  sendPasswordConfirmationMessage,
  sendWrongPasswordConfirmationMessage,
  askImportSeedPhraseMessage,
  sendInvalidSeedPhraseMessage,
  sendImportedWalletMessage,
} from '@app/shared/messages';
import { RedisService } from '../redis/redis.service';
import { BotCommand, NewWalletAction, UserState } from '@app/shared/types';
import {
  ChainDocument,
  Chains,
  Erc20BalanceDocument,
  Erc20Balances,
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
  FUNCTIONS_CALLBACK_DATA_PREFIXS,
  PORTFOLIO_CALLBACK_DATA_PREFIXS,
  SECURITY_AND_PRIVACY_CALLBACK_DATA_PREFIXS,
  SPECIAL_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
} from '@app/shared/constants';
import { PortfolioService } from '../portfolio/portfolio.service';
import { Erc20BalancesDto } from '@app/shared/dto';
import {
  decodeAddress,
  decryptWithPBEAndSecret,
  encryptSeedPhrase,
  generateSeedPhrase,
  getStarkPk,
  getWalletAddress,
  hashPassword,
  isValidPassword,
  validatePhrase,
  verifyPassword,
} from '@app/shared/utils';
import { WalletService } from '../wallet/wallet.service';

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
    private readonly walletService: WalletService,
  ) {
    this.bot = new TelegramBot(configuration().TELEGRAM_BOT_TOKEN, {
      polling: true,
    });
    this.listenOnMessage();
  }

  listenOnMessage() {
    // function to handle all bot's onText events
    this.handleBotOnText();

    // function to handle all bot's onMessage events
    this.handleBotOnMessage();

    // function to handle all bot's onCallbackQuery events
    this.hanldeBotOnCallbackQuery();
    this.bot.on('polling_error', console.log);
  }

  private handleBotOnText() {
    // handle '/start' command
    this.bot.onText(/\/start/, (msg) => {
      sendStartMessage(this.bot, msg);
    });

    // handle '/newwallet' command
    this.bot.onText(/\/newwallet/, async (msg) => {
      // TODO: make 2 options: import or create new wallet
      // TODO: ask confirmation of password before creating new wallet
      const isExistingWallet = await this.isExistingWallet(msg);
      if (isExistingWallet) {
        sendAlreadyCreatedWalletMessage(this.bot, msg);
        return;
      }

      sendOptiontoCreateNewWalletMessage(this.bot, msg);
    });

    // handle '/mywallets' command
    this.bot.onText(/\/mywallets/, async (msg) => {
      const isExistingWallet = await this.isExistingWallet(msg);
      if (!isExistingWallet) {
        sendNoWalletMessage(this.bot, msg);
        return;
      }
      await this.handleManageWalletsCommand(msg);
    });

    // handle '/exportseedphrase' command
    this.bot.onText(/\/exportseedphrase/, async (msg) => {
      const isExistingWallet = await this.isExistingWallet(msg);
      if (!isExistingWallet) {
        sendNoWalletMessage(this.bot, msg);
        return;
      }

      await this.requirePassword(msg, UserState.AwaitingExportSeedPhrase);
    });
  }

  private handleBotOnMessage() {
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
        // if user entered a command delete the state
        if (state) {
          await this.redisService.del(`user:${chatId}:state`);
        }
        return;
      }

      if (!state) {
        return;
      }
      // handle create new wallet command
      if (state.startsWith(UserState.AwaitingNewPassword)) {
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
          const [, action] = state.split('_');
          this.askNewPasswordConfirmation(msg, message, action);
        }
      }

      if (state.startsWith(UserState.AwaitingPasswordConfirmation)) {
        // if user entered a password
        if (message) {
          // delete user's password message
          await this.bot.deleteMessage(msg.chat.id, msg.message_id);
          // verify the password
          const [, password, action] = state.split('_');
          const isMatchingPassword = message === password;
          if (!isMatchingPassword) {
            sendWrongPasswordConfirmationMessage(this.bot, msg);
            return;
          }
          // delete the state
          await this.redisService.del(`user:${chatId}:state`);

          if (action === NewWalletAction.CreateNewWallet) {
            // create new wallet
            this.handleCreateNewWallet(msg);
          } else if (action === NewWalletAction.RestoreWallet) {
            // restore wallet
            this.handleRestoreWalletCommand(msg, password);
          }
        }
      }

      // handle import seed phrase command
      if (state.startsWith(UserState.AwaitingImportSeedPhrase)) {
        // if user entered a password
        if (message) {
          // delete user's password message
          await this.bot.deleteMessage(msg.chat.id, msg.message_id);
          // check if seed phrase is valid

          if (!validatePhrase(message)) {
            sendInvalidSeedPhraseMessage(this.bot, msg);
            return;
          }
          // delete the state
          await this.redisService.del(`user:${chatId}:state`);
          // send a message to the user
          const [, password] = state.split('_');
          await this.handleRestoreWallet(msg, password);
        }
      }

      // handle export seed phrase command
      if (state === UserState.AwaitingExportSeedPhrase) {
        // if user entered a password
        if (message) {
          // delete user's password message
          await this.bot.deleteMessage(msg.chat.id, msg.message_id);
          // check if the password is matching
          const user = await this.userModel.findOne({ chatId: chatId });
          // verify the password
          const isMatchingPassword = await this.isMatchingPassword(msg, user);
          if (!isMatchingPassword) {
            return;
          }

          // delete the state
          await this.redisService.del(`user:${chatId}:state`);
          // send seed phrase to the user
          this.handleExportSeedPhraseCommand(msg, user);
        }
      }

      // hanlde export private key command
      if (state.startsWith(UserState.AwaitingExportPrivateKey)) {
        // if user entered a password
        if (message) {
          // delete user's password message
          await this.bot.deleteMessage(msg.chat.id, msg.message_id);
          // check if the password is matching
          const user = await this.userModel.findOne({ chatId });
          // verify the password
          const isMatchingPassword = await this.isMatchingPassword(msg, user);
          if (!isMatchingPassword) {
            return;
          }

          // delete the state
          await this.redisService.del(`user:${chatId}:state`);
          // send a private key message to the user
          const [, encodedAddress] = state.split('_');
          this.handleExportPrivateKeyCommand(msg, user, encodedAddress);
        }
      }

      // handle invoke transaction command
      if (state.startsWith(UserState.AwaitingInvokeTransaction)) {
        // if user entered a password
        if (message) {
          // delete user's password message
          await this.bot.deleteMessage(msg.chat.id, msg.message_id);
          // check if the password is matching
          const user = await this.userModel.findOne({ chatId: msg.chat.id });
          // verify the password
          const isMatchingPassword = await this.isMatchingPassword(msg, user);
          if (!isMatchingPassword) {
            return;
          }

          // delete the state
          await this.redisService.del(`user:${chatId}:state`);
          // send a private key message to the user
          const [, encodedAddress] = state.split(
            UserState.AwaitingInvokeTransaction + '_',
          );
          this.handleInvokeTransactionCommand(msg, user, encodedAddress);
        }
      }
    });
  }

  private hanldeBotOnCallbackQuery() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const data = callbackQuery.data;

      if (data === TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_START) {
        const state = await this.redisService.get(
          `user:${callbackQuery.message.chat.id}:state`,
        );
        if (state) {
          await this.redisService.del(
            `user:${callbackQuery.message.chat.id}:state`,
          );
        }
        sendStartMessage(this.bot, callbackQuery.message);
        return;
      }

      // handle create new wallet command
      if (data === NewWalletAction.CreateNewWallet) {
        const isExistingWallet = await this.isExistingWallet(
          callbackQuery.message,
        );
        if (isExistingWallet) {
          sendAlreadyCreatedWalletMessage(this.bot, callbackQuery.message);
          return;
        }
        await this.askNewPassword(
          callbackQuery.message,
          NewWalletAction.CreateNewWallet,
        );
        return;
      }

      if (data === NewWalletAction.RestoreWallet) {
        const isExistingWallet = await this.isExistingWallet(
          callbackQuery.message,
        );
        if (isExistingWallet) {
          sendAlreadyCreatedWalletMessage(this.bot, callbackQuery.message);
          return;
        }

        await this.askNewPassword(
          callbackQuery.message,
          NewWalletAction.RestoreWallet,
        );
        return;
      }

      // send wallet's functions message
      if (
        data.startsWith(COMMAND_CALLBACK_DATA_PREFIXS.MY_WALLETS) ||
        data.startsWith(TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS)
      ) {
        sendWalletFunctionMessage(this.bot, callbackQuery);
        return;
      }

      // send message of specific function
      if (data.startsWith(SPECIAL_PREFIXS.FUNCTION)) {
        const isRequirePassword = this.walletService.classifyWalletFunction(
          this.bot,
          callbackQuery,
        );
        if (!isRequirePassword) return;

        const combinedValue = UserState.AwaitingInvokeTransaction + '_' + data;

        this.requirePassword(callbackQuery.message, combinedValue);
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
        await sendBalanceMessage(this.bot, callbackQuery, balances);
        return;
      }

      // execute security and privacy function
      if (data.startsWith(SPECIAL_PREFIXS.SECURITY_AND_PRIVACY)) {
        const combinedValue =
          UserState.AwaitingExportPrivateKey +
          '_' +
          data.replace(
            SECURITY_AND_PRIVACY_CALLBACK_DATA_PREFIXS.EXPORT_PRIVATE_KEY,
            '',
          );

        await this.requirePassword(callbackQuery.message, combinedValue);
        return;
      }

      if (data === TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLETS) {
        const state = await this.redisService.get(
          `user:${callbackQuery.message.chat.id}:state`,
        );
        if (state) {
          await this.redisService.del(
            `user:${callbackQuery.message.chat.id}:state`,
          );
        }
        await this.handleManageWalletsCommand(
          callbackQuery.message,
          callbackQuery.message.message_id,
        );
        return;
      }

      if (data.startsWith(TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_PORTFOLIO)) {
        sendPortfolioMessage(this.bot, callbackQuery);
        return;
      }
    });
  }

  private async isMatchingPassword(
    msg: TelegramBot.Message,
    user: UserDocument,
  ) {
    const isMatchingPassword = await verifyPassword(msg.text, user.password);

    if (!isMatchingPassword) {
      sendWrongPasswordMessage(this.bot, msg);
      return false;
    }

    return true;
  }

  private async isExistingWallet(msg: TelegramBot.Message): Promise<boolean> {
    const user = await this.userModel.findOne({ chatId: msg.chat.id });
    if (!user) {
      return false;
    }

    const wallets = await this.walletModel.find({
      chatId: user,
    });

    if (wallets.length === 0) {
      return false;
    }
    return true;
  }

  private async askNewPassword(msg: TelegramBot.Message, action: string) {
    sendPasswordMessage(this.bot, msg);

    // store user's state in redis
    const combinedValue = UserState.AwaitingNewPassword + '_' + action;
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async askNewPasswordConfirmation(
    msg: TelegramBot.Message,
    password: string,
    action: string,
  ) {
    sendPasswordConfirmationMessage(this.bot, msg);

    // store user's state in redis
    const combinedValue =
      UserState.AwaitingPasswordConfirmation + '_' + password + '_' + action;
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async requirePassword(msg: TelegramBot.Message, value: any) {
    sendRequirePasswordMessage(this.bot, msg);

    // store user's state in redis
    await this.redisService.set(`user:${msg.chat.id}:state`, value);
  }

  private async handleRestoreWalletCommand(
    msg: TelegramBot.Message,
    password: string,
  ) {
    askImportSeedPhraseMessage(this.bot, msg);

    // store user's state in redis
    const combinedValue = UserState.AwaitingImportSeedPhrase + '_' + password;
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleCreateNewWallet(msg: TelegramBot.Message) {
    const seedPhrase = generateSeedPhrase();
    const address = getWalletAddress(seedPhrase, 0);
    // encrypt the seed phrase
    const password = msg.text;
    await this.createWalletEnity(msg, seedPhrase, password, address);

    sendNewWalletMessage(this.bot, msg, seedPhrase, address);
  }

  private async handleRestoreWallet(
    msg: TelegramBot.Message,
    password: string,
  ) {
    const seedPhrase = msg.text;
    const address = getWalletAddress(seedPhrase, 0);
    await this.createWalletEnity(msg, seedPhrase, password, address);

    sendImportedWalletMessage(this.bot, msg, address);
  }

  private async createWalletEnity(
    msg: TelegramBot.Message,
    seedPhrase: string,
    password: string,
    address: string,
  ) {
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

    const newUserDocument = await this.userModel.findOneAndUpdate(
      { chatId: msg.chat.id },
      { $set: newUser },
      { upsert: true },
    );

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
    const bulkWriteData = erc20Balances.map((balance) => {
      return {
        updateOne: {
          filter: {
            wallet: walletDocument,
            contractAddress: balance.contractAddress,
          },
          update: { $set: balance },
          upsert: true,
        },
      };
    });
    await this.erc20BalanceModel.bulkWrite(bulkWriteData);
  }

  private async handleManageWalletsCommand(
    msg: TelegramBot.Message,
    msgId?: number,
  ) {
    const user = await this.userModel.findOne({ chatId: msg.chat.id });
    const wallets = await this.walletModel.find({
      chatId: user,
    });

    // send message with list of wallets
    sendWalletListMessage(this.bot, msg, wallets, msgId);
  }

  private async handleExportSeedPhraseCommand(
    msg: TelegramBot.Message,
    userDocument: UserDocument,
  ) {
    const { seedPhrase: encryptedSeedPhrase, iv, salt } = userDocument;
    const seedPhrase = await decryptWithPBEAndSecret(
      encryptedSeedPhrase,
      msg.text,
      iv,
      salt,
    );

    sendExportSeedPhraseMessage(this.bot, msg, seedPhrase);
  }

  private async handleExportPrivateKeyCommand(
    msg: TelegramBot.Message,
    userDocument: UserDocument,
    encodedAddress: string,
  ) {
    const address = decodeAddress(encodedAddress);

    const wallet = await this.walletModel.findOne({
      chatId: userDocument._id,
      address,
    });

    if (!wallet) {
      sendNoWalletMessage(this.bot, msg);
      return;
    }

    const { seedPhrase: encryptedSeedPhrase, iv, salt } = userDocument;
    const seedPhrase = await decryptWithPBEAndSecret(
      encryptedSeedPhrase,
      msg.text,
      iv,
      salt,
    );

    const privateKey = getStarkPk(seedPhrase, wallet.index);
    sendPrivateKeyMessage(this.bot, msg, privateKey);
  }

  private async handleInvokeTransactionCommand(
    msg: TelegramBot.Message,
    userDocument: UserDocument,
    context: string,
  ) {
    const [fnPrefix, functionName, encodedAddress] = context.split('_');
    const combinedPrefix = fnPrefix + '_' + functionName + '_';
    const address = decodeAddress(encodedAddress);

    let txHash: string = null;
    try {
      switch (combinedPrefix) {
        case FUNCTIONS_CALLBACK_DATA_PREFIXS.DEPLOY_WALLET:
          txHash = await this.walletService.handleDeployWallet(
            this.bot,
            msg,
            userDocument,
            address,
          );
          break;
        case FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER:
          break;
        case FUNCTIONS_CALLBACK_DATA_PREFIXS.BULK_TRANSFER:
          break;
      }
    } catch (error) {
      console.log(error);
      sendErrorMessage(this.bot, msg, error);
    }
  }
}
