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
  AwaitingResetPassword = 'AwaitingResetPassword',
  AwaitingImportSeedPhrase = 'AwaitingImportSeedPhrase',
  AwaitingExportSeedPhrase = 'AwaitingExportSeedPhrase',
  AwaitingExportPrivateKey = 'AwaitingExportPrivateKey',
  AwaitingInvokeTransaction = 'AwaitingInvokeTransaction',
}

export enum WalletAction {
  CreateNewWallet = 'CreateNewWallet',
  RestoreWallet = 'RestoreWallet',
  ResetPassword = 'ResetPassword',
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

export enum BlockWorkerStatus {
  PENDING = 0,
  SUCCESS = 1,
  FAILED = 2,
}

export enum TransactionWorkerStatus {
  PENDING = 0,
  SUCCESS = 1,
}

export enum EventTopic {
  TRANSFER = '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9',
  TRANSFER_SINGLE = '0x182d859c0807ba9db63baf8b9d9fdbfeb885d820be6e206b9dab626d995c433', // transfer ERC-1155
  TRANSFER_BATCH = '0x2563683c757f3abe19c4b7237e2285d8993417ddffe0b54a19eb212ea574b08',
}

export enum EventType {
  UNKNOWN_TRANSFER = 'UNKNOWN_TRANSFER',
  UNKNOWN_MINT = 'UNKNOWN_MINT',
  UNKNOWN_BURN = 'UNKNOWN_BURN',
  MINT_721 = 'MINT_721',
  BURN_721 = 'BURN_721',
  MINT_1155 = 'MINT_1155',
  BURN_1155 = 'BURN_1155',
  TRANSFER_721 = 'TRANSFER_721',
  TRANSFER_1155 = 'TRANSFER_1155',
}

export enum InterfaceId {
  ERC721 = '0x33eb2f84c309543403fd69f0d0f363781ef06ef6faeb0131ff16ea3175bd943',
  OLD_ERC721 = '0x80ac58cd',
  ERC1155 = '0x6114a8f75559e1b39fcba08ce02961a1aa082d9256a158dd3e64964e4b1b52',
  OLD_ERC1155 = '0xd9b67a26',
}
