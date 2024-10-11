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
  sendNftDetailMessage,
  sendRequireNftReceiverMessage,
  sendInsufficientBalanceErrorMessage,
  sendInsufficientNftBalanceErrorMessage,
  sendReviewBulkTransfer,
} from '@app/shared/messages';
import { RedisService } from '../redis/redis.service';
import {
  BotCommand,
  WalletAction,
  UserState,
  ContractStandard,
} from '@app/shared/types';
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
  BULK_TRANSFER_CALLBACK_DATA_PREFIXS,
  COMMAND_CALLBACK_DATA_PREFIXS,
  COMMON_CONTRACT_ADDRESS,
  CONFIRM_TRANSACTION_CALLBACK_DATA_PREFIXS,
  FUNCTIONS_CALLBACK_DATA_PREFIXS,
  SECURITY_AND_PRIVACY_CALLBACK_DATA_PREFIXS,
  SPECIAL_PREFIXS,
  TURN_BACK_CALLBACK_DATA_KEYS,
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
import { isHexadecimal, isNumberString, isInt } from 'class-validator';
import { formatUnits, parseUnits } from 'ethers';
import { Web3Service } from '@app/web3/web3.service';
import { CallData, uint256, EstimateFee, Account } from 'starknet';

@Injectable()
export class BotService {
  private bot: TelegramBot = configuration().BOT;

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
    this.bot.startPolling({ restart: true });
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
          context.sectionDetail[context.currentIndex].contractDetail.address,
          context.wallet,
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

        context.sectionDetail[context.currentIndex].amount = message;
        // require password
        if (!context.isBulkTransfer) {
          await this.requirePassword(
            msg,
            UserState.AwaitingInvokeTransaction +
              '_' +
              FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER +
              JSON.stringify(context),
          );
        } else {
          await this.redisService.set(
            `user:${msg.chat.id}:state`,
            UserState.AwaittingNextActionBulkTransfer +
              '_' +
              JSON.stringify(context),
          );
          sendReviewBulkTransfer(this.bot, msg, JSON.stringify(context));
        }
      }

      if (state.startsWith(UserState.AwaitingRequireNftReceiver)) {
        const isValidReceiver = isHexadecimal(message);
        const stringifiedContext = state.replace(
          UserState.AwaitingRequireNftReceiver + '_',
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

        context.sectionDetail[context.currentIndex].receiver =
          formattedContractAddress(message);
        if (
          context.sectionDetail[context.currentIndex].contractDetail
            .standard === ContractStandard.ERC1155
        ) {
          await this.handleRequireNftAmount(msg, JSON.stringify(context));
        } else {
          context.sectionDetail[context.currentIndex].amount = '1';
          if (!context.isBulkTransfer) {
            await this.requirePassword(
              msg,
              UserState.AwaitingInvokeTransaction +
                '_' +
                FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER +
                JSON.stringify(context),
            );
          } else {
            await this.redisService.set(
              `user:${msg.chat.id}:state`,
              UserState.AwaittingNextActionBulkTransfer +
                '_' +
                JSON.stringify(context),
            );
            sendReviewBulkTransfer(this.bot, msg, JSON.stringify(context));
          }
        }
      }

      if (state.startsWith(UserState.AwaitingRequireNftAmount)) {
        const stringifiedContext = state.replace(
          UserState.AwaitingRequireNftAmount + '_',
          '',
        );

        if (!isNumberString(message) && !isInt(Number(message))) {
          sendInvalidAmountMessage(this.bot, msg);
          return;
        }
        const context = JSON.parse(stringifiedContext);
        const { wallet, sectionDetail, currentIndex } = context;
        const { contractDetail, tokenId } = sectionDetail[currentIndex];

        const balance = await this.portfolioService.getWalletNftBalance(
          wallet.address,
          contractDetail.address,
          tokenId,
        );

        if (Number(balance.amount) < Number(message)) {
          sendInsufficientNftBalanceErrorMessage(
            this.bot,
            msg,
            encodeAddress(context.wallet.address),
          );
          return;
        }

        // delete the state
        await this.redisService.del(`user:${chatId}:state`);

        sectionDetail[currentIndex].amount = message;
        // require password
        if (!context.isBulkTransfer) {
          await this.requirePassword(
            msg,
            UserState.AwaitingInvokeTransaction +
              '_' +
              FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER +
              JSON.stringify(context),
          );
        } else {
          await this.redisService.set(
            `user:${msg.chat.id}:state`,
            UserState.AwaittingNextActionBulkTransfer +
              '_' +
              JSON.stringify(context),
          );
          sendReviewBulkTransfer(this.bot, msg, JSON.stringify(context));
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
        const isRequirePassword =
          await this.walletService.classifyWalletFunction(
            this.bot,
            callbackQuery,
          );
        if (!isRequirePassword) return;

        const combinedValue = UserState.AwaitingInvokeTransaction + '_' + data;

        this.requirePassword(callbackQuery.message, combinedValue);
      }

      // execute portfolio function
      if (
        data.startsWith(SPECIAL_PREFIXS.PORTFOLIO) ||
        data.startsWith(BULK_TRANSFER_CALLBACK_DATA_PREFIXS.ERC20) ||
        data.startsWith(BULK_TRANSFER_CALLBACK_DATA_PREFIXS.NFT)
      ) {
        const [fnPrefix, functionName, encodedAddress] = data.split('_');
        const combinedPrefix = fnPrefix + '_' + functionName + '_';

        let balances: Erc20BalancesDto[] = [];
        switch (functionName) {
          case 'erc20':
            balances = await this.portfolioService.getWalletErc20Balances(
              decodeAddress(encodedAddress),
            );
            break;
          case 'nft':
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

      if (
        data.startsWith(BULK_TRANSFER_CALLBACK_DATA_PREFIXS.ADD_NEW_SECTION)
      ) {
        await this.walletService.handleAddSectionBulkTransfer(
          this.bot,
          callbackQuery,
        );
        return;
      }

      if (data.startsWith(SPECIAL_PREFIXS.VIEW_TOKEN)) {
        const remainningData = data.replace(SPECIAL_PREFIXS.VIEW_TOKEN, '');
        const [type, encodedContractAddress, walletIndex] =
          remainningData.split('_');

        const user = await this.userModel.findOne({
          chatId: callbackQuery.message.chat.id,
        });
        const wallet = await this.walletModel.findOne({
          chatId: user._id,
          index: walletIndex,
        });
        if (type === 'erc20') {
          const balance = await this.portfolioService.getWalletErc20Balance(
            wallet.address,
            decodeAddress(encodedContractAddress),
            wallet,
          );

          sendErc20DetailMessage(this.bot, callbackQuery, wallet, balance);
        } else if (type === 'nft') {
          const [, encodedContractAddress, , tokenId] =
            remainningData.split('_');
          const nftBalance = await this.portfolioService.getWalletNftBalance(
            wallet.address,
            decodeAddress(encodedContractAddress),
            tokenId,
            wallet,
          );

          sendNftDetailMessage(this.bot, callbackQuery, wallet, nftBalance);
        }
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
        } else if (type === 'nft') {
          const [, , , tokenId] = conbinedData.split('_');
          await this.handleRequireNftReceiver(
            callbackQuery.message,
            user,
            wallet,
            decodeAddress(encodedContractAddress),
            tokenId,
          );
        }
      }

      if (
        data.startsWith(BULK_TRANSFER_CALLBACK_DATA_PREFIXS.FINISH_ADD_SECTION)
      ) {
        const state = await this.redisService.get(
          `user:${callbackQuery.message.chat.id}:state`,
        );

        const stringifiedContext = state.replace(
          UserState.AwaittingNextActionBulkTransfer + '_',
          '',
        );

        await this.requirePassword(
          callbackQuery.message,
          UserState.AwaitingInvokeTransaction +
            '_' +
            FUNCTIONS_CALLBACK_DATA_PREFIXS.TRANSFER +
            stringifiedContext,
        );
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

        // await this.redisService.del(
        //   `user:${callbackQuery.message.chat.id}:state`,
        // );
        try {
          sendAwaitForInvolkTransactionMessage(this.bot, callbackQuery.message);
          await this.walletService.handleExecuteTransaction(
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
      { upsert: true, new: true },
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

    const state = await this.redisService.get(`user:${msg.chat.id}:state`);

    let isBulkTransfer = false;
    let sectionDetail = [];
    let currentIndex = 0;
    if (state) {
      if (state.startsWith(UserState.AwaitingNewBulkTransfer)) {
        isBulkTransfer = true;
      }

      if (state.startsWith(UserState.AwaittingAddNewSectionBulkTransfer)) {
        const stringifiedContext = state.replace(
          UserState.AwaittingAddNewSectionBulkTransfer + '_',
          '',
        );
        isBulkTransfer = true;

        const context = JSON.parse(stringifiedContext);
        sectionDetail = context.sectionDetail;
        currentIndex = context.currentIndex;
      }
    }
    sectionDetail.push({ contractDetail });

    const transferDetail = {
      userDocument,
      wallet,
      isBulkTransfer,
      currentIndex,
      sectionDetail,
    };

    const combinedValue =
      UserState.AwaitingRequireErc20Receiver +
      '_' +
      JSON.stringify(transferDetail);

    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleRequireNftReceiver(
    msg: TelegramBot.Message,
    userDocument: UserDocument,
    wallet: WalletDocument,
    contractAddress: string,
    tokenId: string,
  ) {
    sendRequireNftReceiverMessage(this.bot, msg);

    const contractDetail = await this.contractDetailModel.findOne({
      address: contractAddress,
    });

    let isBulkTransfer = false;
    let sectionDetail = [];
    let currentIndex = 0;
    const state = await this.redisService.get(`user:${msg.chat.id}:state`);
    if (state) {
      if (state.startsWith(UserState.AwaitingNewBulkTransfer)) {
        isBulkTransfer = true;
      }

      if (state.startsWith(UserState.AwaittingAddNewSectionBulkTransfer)) {
        const stringifiedContext = state.replace(
          UserState.AwaittingAddNewSectionBulkTransfer + '_',
          '',
        );

        isBulkTransfer = true;

        const context = JSON.parse(stringifiedContext);
        sectionDetail = context.sectionDetail;
        currentIndex = context.currentIndex;
      }
    }

    sectionDetail.push({ contractDetail, tokenId });

    const transferDetail = {
      userDocument,
      wallet,
      isBulkTransfer,
      currentIndex,
      sectionDetail,
    };

    const combinedValue =
      UserState.AwaitingRequireNftReceiver +
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
    transferDetail.sectionDetail[transferDetail.currentIndex].receiver =
      formattedContractAddress(receiver);

    const combinedValue =
      UserState.AwaitingRequireErc20Amount +
      '_' +
      JSON.stringify(transferDetail);
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleRequireNftAmount(
    msg: TelegramBot.Message,
    context: string,
  ) {
    const transferDetail = JSON.parse(context);

    const combinedValue =
      UserState.AwaitingRequireNftAmount + '_' + JSON.stringify(transferDetail);
    await this.redisService.set(`user:${msg.chat.id}:state`, combinedValue);
  }

  private async handleRequireConfirmTransaction(
    msg: TelegramBot.Message,
    context: string,
  ) {
    const transferDetail = JSON.parse(context);
    const password = msg.text;
    const {
      wallet,
      sectionDetail,
      userDocument,
      isBulkTransfer,
      currentIndex,
    } = transferDetail;

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

    const estimatedFee = await this.estimateTransactionFee(
      msg,
      context,
      account,
    );
    if (!estimatedFee) return;

    const ethBalance = await this.portfolioService.getWalletErc20Balance(
      wallet.address,
      COMMON_CONTRACT_ADDRESS.ETH,
      wallet,
    );

    if (Number(ethBalance.amount) < Number(estimatedFee.suggestedMaxFee)) {
      sendInsufficientBalanceErrorMessage(
        this.bot,
        msg,
        estimatedFee.suggestedMaxFee.toString(),
        encodeAddress(transferDetail.wallet.address),
      );
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

  private async estimateTransactionFee(
    msg: TelegramBot.Message,
    context: string,
    account: Account,
  ): Promise<EstimateFee> {
    const transferDetail = JSON.parse(context);
    const { wallet, sectionDetail, isBulkTransfer } = transferDetail;

    let estimatedFee: EstimateFee;

    try {
      if (!isBulkTransfer) {
        const { contractDetail, receiver, tokenId, amount } = sectionDetail[0];

        switch (contractDetail.standard) {
          case ContractStandard.ERC20:
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
            break;
          case ContractStandard.ERC721:
            try {
              estimatedFee = await account.estimateFee([
                {
                  contractAddress: contractDetail.address,
                  entrypoint: 'transferFrom',
                  calldata: CallData.compile({
                    from: wallet.address,
                    to: receiver,
                    tokenId: uint256.bnToUint256(tokenId),
                  }),
                },
              ]);
            } catch (error) {
              estimatedFee = await account.estimateFee([
                {
                  contractAddress: contractDetail.address,
                  entrypoint: 'transfer_from',
                  calldata: CallData.compile({
                    from: wallet.address,
                    to: receiver,
                    tokenId: uint256.bnToUint256(tokenId),
                  }),
                },
              ]);
            }
            break;
          case ContractStandard.ERC1155:
            try {
              estimatedFee = await account.estimateFee([
                {
                  contractAddress: contractDetail.address,
                  entrypoint: 'safeTransferFrom',
                  calldata: CallData.compile({
                    from: wallet.address,
                    to: receiver,
                    id: uint256.bnToUint256(tokenId),
                    amount: uint256.bnToUint256(amount),
                    data: [],
                  }),
                },
              ]);
            } catch (error) {
              estimatedFee = await account.estimateFee([
                {
                  contractAddress: contractDetail.address,
                  entrypoint: 'safe_transfer_from',
                  calldata: CallData.compile({
                    from: wallet.address,
                    to: receiver,
                    id: uint256.bnToUint256(tokenId),
                    amount: uint256.bnToUint256(amount),
                    data: [],
                  }),
                },
              ]);
            }
            break;
        }
      } else {
        const multiCallData = [];
        const multiCallCamelCaseData = [];
        for (const section of sectionDetail) {
          const { contractDetail, receiver, tokenId, amount } = section;
          switch (contractDetail.standard) {
            case ContractStandard.ERC20:
              multiCallData.push({
                contractAddress: contractDetail.address,
                entrypoint: 'transfer',
                calldata: CallData.compile({
                  recipient: receiver,
                  amount: uint256.bnToUint256(
                    parseUnits(amount, contractDetail.decimals),
                  ),
                }),
              });
              multiCallCamelCaseData.push({
                contractAddress: contractDetail.address,
                entrypoint: 'transfer',
                calldata: CallData.compile({
                  recipient: receiver,
                  amount: uint256.bnToUint256(
                    parseUnits(amount, contractDetail.decimals),
                  ),
                }),
              });
              break;
            case ContractStandard.ERC721:
              multiCallData.push({
                contractAddress: contractDetail.address,
                entrypoint: 'transfer_from',
                calldata: CallData.compile({
                  from: wallet.address,
                  to: receiver,
                  tokenId: uint256.bnToUint256(tokenId),
                }),
              });
              multiCallCamelCaseData.push({
                contractAddress: contractDetail.address,
                entrypoint: 'transferFrom',
                calldata: CallData.compile({
                  from: wallet.address,
                  to: receiver,
                  tokenId: uint256.bnToUint256(tokenId),
                }),
              });
              break;
            case ContractStandard.ERC1155:
              multiCallData.push({
                contractAddress: contractDetail.address,
                entrypoint: 'safe_transfer_from',
                calldata: CallData.compile({
                  from: wallet.address,
                  to: receiver,
                  id: uint256.bnToUint256(tokenId),
                  amount: uint256.bnToUint256(amount),
                  data: [],
                }),
              });
              multiCallCamelCaseData.push({
                contractAddress: contractDetail.address,
                entrypoint: 'safeTransferFrom',
                calldata: CallData.compile({
                  from: wallet.address,
                  to: receiver,
                  id: uint256.bnToUint256(tokenId),
                  amount: uint256.bnToUint256(amount),
                  data: [],
                }),
              });
              break;
          }
        }

        try {
          estimatedFee = await account.estimateFee(multiCallData);
        } catch (error) {
          estimatedFee = await account.estimateFee(multiCallCamelCaseData);
        }
      }
    } catch (error) {
      console.log(error);

      sendErrorMessage(this.bot, msg);
      return;
    }

    return estimatedFee;
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
