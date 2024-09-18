// SPDX-License-Identifier: MIT

export enum BotCommand {
  Start = '/start',
  NewWallet = '/newwallet',
  MyWallets = '/mywallets',
  ExportSeedPhrase = '/exportseedphrase',
  About = '/about',
}

export enum UserState {
  AwaitingNewWallet = 'AwaitingNewWallet',
  AwaitingPasswordConfirmation = 'AwaitingPasswordConfirmation',
  AwaitingExportSeedPhrase = 'AwaitingExportSeedPhrase',
  AwaitingExportPrivateKey = 'AwaitingExportPrivateKey',
}

export enum ContractStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export enum TransactionStatus {
  Pending = 'Pending',
  Success = 'Success',
  Failed = 'Failed',
}

export enum TransactionType {
  Deploy = 'Deploy',
  Transfer = 'Transfer',
  Approve = 'Approve',
  ApproveForAll = 'ApproveForAll',
  Mint = 'Mint',
  Burn = 'Burn',
  Other = 'Other',
}
