// SPDX-License-Identifier: MIT

export enum BotCommand {
  Start = '/start',
  NewWallet = '/newwallet',
  MyWallets = '/mywallets',
  ExportSeedPhrase = '/exportseedphrase',
  About = '/about',
}

export enum UserState {
  AwaitingNewPassword = 'AwaitingNewPassword',
  AwaitingPasswordConfirmation = 'AwaitingPasswordConfirmation',
  AwaitingImportSeedPhrase = 'AwaitingImportSeedPhrase',
  AwaitingExportSeedPhrase = 'AwaitingExportSeedPhrase',
  AwaitingExportPrivateKey = 'AwaitingExportPrivateKey',
  AwaitingInvokeTransaction = 'AwaitingInvokeTransaction',
}

export enum NewWalletAction {
  CreateNewWallet = 'CreateNewWallet',
  RestoreWallet = 'RestoreWallet',
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
