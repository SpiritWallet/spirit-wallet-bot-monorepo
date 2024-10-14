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

export function sendAboutMessage(bot: TelegramBot, msg: TelegramBot.Message) {
  const message = `Welcome @${msg.chat.username} to Spirit Wallet, your smart wallet that can sending, receiving currencies to anyone, anywhere, effortless.
  \nSpirit Wallet, an advanced custody, account abstraction and smart wallet solution that revolutionizes the management of your digital assets. Designed to be simple and impressive for everyone to use.
  \nSpirit Wallet integrates seamlessly with Telegram, making it a powerful tool for social payments, swaps and direct trading via chat.
  \nTbh, you can do whatever you want with this wallet!
  \nTwitter: [@Spirit_wallet](https://x.com/Spirit_wallet).\nTelegram: [@spirit_wallet_test_bot](https://t.me/spirit_wallet_test_bot).
  \nStart exploring the decentralized world with Spirit Wallet now! 🚀`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}
