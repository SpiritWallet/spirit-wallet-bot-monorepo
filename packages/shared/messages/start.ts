// SPDX-License-Identifier: MIT

import TelegramBot from 'node-telegram-bot-api';

export function sendStartMessage(bot: TelegramBot, msg: TelegramBot.Message) {
  const message = `Welcome @${msg.chat.username} to Spirit Wallet, your trusted blockchain wallet for managing your digital assets on the Starknet network! 🎉
          \n\nWith Spirit Wallet, you can seamlessly manage your ERC-20, ERC-721, and ERC-1155 tokens all in one place. Whether you're sending, receiving, or securely storing your assets, our wallet ensures you have complete control over your digital portfolio.
          \n\nThere are commands you can use to interact with your wallet:\n\n/newwallet - Create a new wallet\n/mywallets - Manage your wallets\n/exportseedphrase - Export your seed phrase\n/about - Learn more about Spirit Wallet
          \n\nStart exploring the decentralized world with Spirit Wallet now! 🚀`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}
