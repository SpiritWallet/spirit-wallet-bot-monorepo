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
  sendRequireSeedPhraseMessage,
  sendResetPasswordSuccessMessage,
  sendMissMatchSeedPhraseMessage,
  sendErc20DetailMessage,
  sendRequireErc20ReceiverMessage,
  sendInvalidReceiverMessage,
  sendRequireErc20AmountMessage,
  sendInsufficientErc20BalanceErrorMessage,
  sendConfirmTransactionMessage,
  sendNotDeployedWalletMessage,
  sendInvalidAmountMessage,
  sendAwaitForInvolkTransactionMessage,
} from '@app/shared/messages';
import { RedisService } from '../redis/redis.service';
import { BotCommand, WalletAction, UserState } from '@app/shared/types';
import {
  ChainDocument,
  Chains,
  ContractDetails,
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
  CONFIRM_TRANSACTION_CALLBACK_DATA_PREFIXS,
  FUNCTIONS_CALLBACK_DATA_PREFIXS,
  PORTFOLIO_CALLBACK_DATA_PREFIXS,
  SECURITY_AND_PRIVACY_CALLBACK_DATA_PREFIXS,
  SPECIAL_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
  VIEW_TOKEN_CALLBACK_DATA_PREFIXS,
} from '@app/shared/constants';
import { PortfolioService } from '../portfolio/portfolio.service';
import { Erc20BalancesDto } from '@app/shared/dto';
import {
  decodeAddress,
  decryptWithPBEAndSecret,
  encodeAddress,
  encryptSeedPhrase,
  formattedContractAddress,
  generateSeedPhrase,
  getStarkPk,
  getWalletAddress,
  hashPassword,
  isValidPassword,
  validatePhrase,
  verifyPassword,
} from '@app/shared/utils';
import { WalletService } from '../wallet/wallet.service';
import { isHexadecimal, isNumberString } from 'class-validator';
import { formatUnits } from 'ethers';
import { Web3Service } from '@app/web3/web3.service';
import { CallData, uint256 } from 'starknet';

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
    @InjectModel(ContractDetails.name)
    private readonly contractDetailModel: Model<ContractDetails>,
    private readonly redisService: RedisService,
    private readonly portfolioService: PortfolioService,
    private readonly walletService: WalletService,
    private readonly web3Service: Web3Service,
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

          if (action === WalletAction.CreateNewWallet) {
            // create new wallet
            this.handleCreateNewWallet(msg);
          } else if (action === WalletAction.RestoreWallet) {
            // restore wallet
            this.handleRestoreWalletCommand(msg);
          } else if (action.startsWith(WalletAction.ResetPassword)) {
            // reset password
            const [, seedPhrase] = action.split(':');
            this.handleResetPasswordCommand(msg, seedPhrase);
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

      // handle reset password command
      if (state === UserState.AwaitingResetPassword) {
        if (message) {
          // delete user's password message
          await this.bot.deleteMessage(msg.chat.id, msg.message_id);
          // check if seed phrase is valid

          if (!validatePhrase(message)) {
            sendInvalidSeedPhraseMessage(this.bot, msg);
            return;
          }
          // check if seed phrase is matching
          const user = await this.userModel.findOne({ chatId: chatId });
          const isMatchingSeedPhrase = await this.isMatchingSeedPhrase(
            msg,
            user,
          );
          if (!isMatchingSeedPhrase) {
            sendMissMatchSeedPhraseMessage(this.bot, msg);
            return;
          }

          // delete the state
          await this.redisService.del(`user:${chatId}:state`);
          const combinedAction = WalletAction.ResetPassword + ':' + message;
          await this.askNewPassword(msg, combinedAction);
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
          const [, context] = state.split(
            UserState.AwaitingInvokeTransaction + '_',
          );
          this.handleInvokeTransactionCommand(msg, user, context);
        }
      }

      if (state.startsWith(UserState.AwaitingRequireErc20Receiver)) {
        const isValidReceiver = isHexadecimal(message);
        const stringifiedContext = state.replace(
          UserState.AwaitingRequireErc20Receiver + '_',
          '',
        );
        const context = JSON.parse(stringifiedContext);
        if (!isValidReceiver) {
          sendInvalidReceiverMessage(
            this.bot,
            msg,
            encodeAddress(context.wallet.address),
          );
          return;
        }

        // delete the state
        await this.redisService.del(`user:${chatId}:state`);
        await this.handleRequireErc20Amount(msg, message, stringifiedContext);
      }

      if (state.startsWith(UserState.AwaitingRequireErc20Amount)) {
        const stringifiedContext = state.replace(
          UserState.AwaitingRequireErc20Amount + '_',
          '',
        );

        if (!isNumberString(message)) {
          sendInvalidAmountMessage(this.bot, msg);
          return;
        }
        const context = JSON.parse(stringifiedContext);

        const balance = await this.portfolioService.getWalletErc20Balance(
          context.wallet.address,
          context.contractDetail.address,
        );

        if (
          Number(formatUnits(balance.amount, balance.contractDetail.decimals)) <
          Number(message)
        ) {
          sendInsufficientErc20BalanceErrorMessage(
            this.bot,
            msg,
            encodeAddress(context.wallet.address),
          );
          return;
        }

        // delete the state
        await this.redisService.del(`user:${chatId}:state`);

        context.amount = message;
        // require password
        await this.requirePassword(
          msg,
          UserState.AwaitingInvokeTransaction +
            '_' +
            FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER +
            JSON.stringify(context),
        );
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
      if (data === WalletAction.CreateNewWallet) {
        const isExistingWallet = await this.isExistingWallet(
          callbackQuery.message,
        );
        if (isExistingWallet) {
          sendAlreadyCreatedWalletMessage(this.bot, callbackQuery.message);
          return;
        }
        await this.askNewPassword(
          callbackQuery.message,
          WalletAction.CreateNewWallet,
        );
        return;
      }

      if (data === WalletAction.RestoreWallet) {
        const isExistingWallet = await this.isExistingWallet(
          callbackQuery.message,
        );
        if (isExistingWallet) {
          sendAlreadyCreatedWalletMessage(this.bot, callbackQuery.message);
          return;
        }

        await this.askNewPassword(
          callbackQuery.message,
          WalletAction.RestoreWallet,
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
            balances = await this.portfolioService.getWalletNftBalances(
              decodeAddress(encodedAddress),
            );
            break;
        }

        const wallet = await this.walletModel.findOne({
          address: decodeAddress(encodedAddress),
        });
        await sendBalanceMessage(
          this.bot,
          callbackQuery,
          wallet.index,
          balances,
          combinedPrefix,
        );
        return;
      }

      if (data.startsWith(VIEW_TOKEN_CALLBACK_DATA_PREFIXS.ERC20_TOKENS)) {
        const conbinedData = data.replace(
          VIEW_TOKEN_CALLBACK_DATA_PREFIXS.ERC20_TOKENS,
          '',
        );
        const [encodedContractAddress, walletIndex] = conbinedData.split('_');
        const user = await this.userModel.findOne({
          chatId: callbackQuery.message.chat.id,
        });
        const wallet = await this.walletModel.findOne({
          chatId: user._id,
          index: walletIndex,
        });
        const balance = await this.portfolioService.getWalletErc20Balance(
          wallet.address,
          decodeAddress(encodedContractAddress),
        );

        sendErc20DetailMessage(this.bot, callbackQuery, wallet, balance);
      }

      if (data.startsWith(SPECIAL_PREFIXS.TRANSFER)) {
        const conbinedData = data.replace(SPECIAL_PREFIXS.TRANSFER, '');
        const [type, encodedContractAddress, walletIndex] =
          conbinedData.split('_');
        const user = await this.userModel.findOne({
          chatId: callbackQuery.message.chat.id,
        });
        const wallet = await this.walletModel.findOne({
          chatId: user._id,
          index: walletIndex,
        });

        if (!wallet.isDeployed) {
          sendNotDeployedWalletMessage(
            this.bot,
            callbackQuery.message,
            encodeAddress(wallet.address),
          );
          return;
        }

        if (type === 'erc20') {
          await this.handleRequireErc20Receiver(
            callbackQuery.message,
            user,
            wallet,
            decodeAddress(encodedContractAddress),
          );
        }
      }

      if (data === CONFIRM_TRANSACTION_CALLBACK_DATA_PREFIXS) {
        const data = await this.redisService.get(
          `user:${callbackQuery.message.chat.id}:state`,
        );

        if (!data) return;

        const stringifiedTransferDetail = data.replace(
          UserState.AwaitingConfirmTransaction + '_',
          '',
        );
        try {
          sendAwaitForInvolkTransactionMessage(this.bot, callbackQuery.message);
          await this.walletService.handleTransferErc20(
            this.bot,
            callbackQuery.message,
            stringifiedTransferDetail,
          );
        } catch (error) {
          console.log(error);

          sendErrorMessage(this.bot, callbackQuery.message);
        }
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

      // handle forgot password command
      if (data === SPECIAL_PREFIXS.FORGOT_PASSWORD) {
        await this.requireSeedPhraseToResetPassword(callbackQuery.message);
        return;
      }
      1;

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

  private async isMatchingSeedPhrase(
    msg: TelegramBot.Message,
    user: UserDocument,
  ) {
    const seedPhrase = msg.text;
    const parentWallet = getWalletAddress(seedPhrase, 0);
    const wallet = await this.walletModel.findOne({
      chatId: user,
      address: parentWallet,
    });
    if (!wallet) {
      return false;
    }

    return true;
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

  private async handleRestoreWalletCommand(msg: TelegramBot.Message) {
    askImportSeedPhraseMessage(this.bot, msg);
    const password = msg.text;
    // store user's state in redis
    const combinedValue = UserState.AwaitingImportSeedPhrase + '_' + password;
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleResetPasswordCommand(
    msg: TelegramBot.Message,
    seedPhrase: string,
  ) {
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

    await this.userModel.findOneAndUpdate(
      { chatId: msg.chat.id },
      { $set: newUser },
    );

    sendResetPasswordSuccessMessage(this.bot, msg);
  }

  private async requireSeedPhraseToResetPassword(msg: TelegramBot.Message) {
    sendRequireSeedPhraseMessage(this.bot, msg);

    // store user's state in redis
    await this.redisService.set(
      `user:${msg.chat.id}:state`,
      UserState.AwaitingResetPassword,
    );
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
        latestTimestamp: 0,
      },
      {
        wallet: walletDocument,
        chain: chainDocument,
        contractAddress: COMMON_CONTRACT_ADDRESS.STRK,
        amount: '0',
        latestTimestamp: 0,
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

  private async handleRequireErc20Receiver(
    msg: TelegramBot.Message,
    userDocument: UserDocument,
    wallet: WalletDocument,
    contractAddress: string,
  ) {
    sendRequireErc20ReceiverMessage(this.bot, msg);

    const contractDetail = await this.contractDetailModel.findOne({
      address: contractAddress,
    });

    const transferDetail = {
      userDocument,
      wallet,
      contractDetail,
    };

    const combinedValue =
      UserState.AwaitingRequireErc20Receiver +
      '_' +
      JSON.stringify(transferDetail);

    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleRequireErc20Amount(
    msg: TelegramBot.Message,
    receiver: string,
    context: string,
  ) {
    sendRequireErc20AmountMessage(this.bot, msg);

    const transferDetail = JSON.parse(context);
    transferDetail.receiver = formattedContractAddress(receiver);

    const combinedValue =
      UserState.AwaitingRequireErc20Amount +
      '_' +
      JSON.stringify(transferDetail);
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleRequireConfirmTransaction(
    msg: TelegramBot.Message,
    context: string,
  ) {
    const transferDetail = JSON.parse(context);
    const password = msg.text;
    const { wallet, contractDetail, userDocument, receiver } = transferDetail;

    const { seedPhrase: encryptedSeedPhrase, iv, salt } = userDocument;
    const seedPhrase = await decryptWithPBEAndSecret(
      encryptedSeedPhrase,
      password,
      iv,
      salt,
    );

    const privateKey = getStarkPk(seedPhrase, wallet.index);
    const chainDocument = await this.chainModel.findOne();
    const account = this.web3Service.getAccountInstance(
      wallet.address,
      privateKey,
      chainDocument.rpc,
    );

    let estimatedFee;
    try {
      estimatedFee = await account.estimateFee([
        {
          contractAddress: contractDetail.address,
          entrypoint: 'transfer',
          calldata: CallData.compile({
            recipient: receiver,
            amount: uint256.bnToUint256('1'),
          }),
        },
      ]);
    } catch (error) {
      console.log(error);

      sendErrorMessage(this.bot, msg);
      return;
    }

    transferDetail.estimatedFee = estimatedFee.suggestedMaxFee.toString();
    transferDetail.wallet.privateKey = privateKey;

    sendConfirmTransactionMessage(
      this.bot,
      msg,
      context,
      estimatedFee.suggestedMaxFee.toString(),
    );

    const combinedValue =
      UserState.AwaitingConfirmTransaction +
      '_' +
      JSON.stringify(transferDetail);
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleInvokeTransactionCommand(
    msg: TelegramBot.Message,
    userDocument: UserDocument,
    context: string,
  ) {
    const [fnPrefix, functionName] = context.split('_');
    const combinedPrefix = fnPrefix + '_' + functionName + '_';

    let txHash: string = null;
    try {
      switch (combinedPrefix) {
        case FUNCTIONS_CALLBACK_DATA_PREFIXS.DEPLOY_WALLET:
          const address = decodeAddress(
            context.replace(FUNCTIONS_CALLBACK_DATA_PREFIXS.DEPLOY_WALLET, ''),
          );

          txHash = await this.walletService.handleDeployWallet(
            this.bot,
            msg,
            userDocument,
            address,
          );
          break;
        case FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER:
          // send Confirm Transaction message
          await this.handleRequireConfirmTransaction(
            msg,
            context.replace(FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER, ''),
          );
          break;
        case FUNCTIONS_CALLBACK_DATA_PREFIXS.BULK_TRANSFER:
          break;
      }
    } catch (error) {
      console.log(error);
      sendErrorMessage(this.bot, msg);
    }
  }
}
