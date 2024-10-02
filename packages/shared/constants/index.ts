// SPDX-License-Identifier: MIT

export * from './contract';
export * from './rpc';

export const SALT_ROUND = 10;

export const COMMAND_CALLBACK_DATA_PREFIXS = {
  MY_WALLETS: 'my_wallets_',
};

export const SPECIAL_PREFIXS = {
  FUNCTION: 'fn_',
  PORTFOLIO: 'pf_',
  SECURITY_AND_PRIVACY: 'sp_',
  FORGOT_PASSWORD: 'forgot_password',
  VIEW_TOKEN: 'vt_',
  TRANSFER: 'trf_',
  BULK_TRANSFER: 'bt_',
};

export const FUNCTIONS_CALLBACK_DATA_PREFIXS = {
  DEPLOY_WALLET: `${SPECIAL_PREFIXS.FUNCTION}dw_`,
  PORTFOLIO: `${SPECIAL_PREFIXS.FUNCTION}pf_`,
  TRANSFER: `${SPECIAL_PREFIXS.FUNCTION}trf_`,
  BULK_TRANSFER: `${SPECIAL_PREFIXS.FUNCTION}bt_`,
  SECURITY_AND_PRIVACY: `${SPECIAL_PREFIXS.FUNCTION}sp_`,
};

export const PORTFOLIO_CALLBACK_DATA_PREFIXS = {
  ERC20_TOKENS: `${SPECIAL_PREFIXS.PORTFOLIO}erc20_`,
  NFT: `${SPECIAL_PREFIXS.PORTFOLIO}nft_`,
};

export const VIEW_TOKEN_CALLBACK_DATA_PREFIXS = {
  ERC20_TOKENS: `${SPECIAL_PREFIXS.VIEW_TOKEN}erc20_`,
  NFT: `${SPECIAL_PREFIXS.VIEW_TOKEN}nft_`,
};

export const SECURITY_AND_PRIVACY_CALLBACK_DATA_PREFIXS = {
  EXPORT_PRIVATE_KEY: `${SPECIAL_PREFIXS.SECURITY_AND_PRIVACY}epk_`,
};

export const TRANSFER_CALLBACK_DATA_PREFIXS = {
  ERC20: `${SPECIAL_PREFIXS.TRANSFER}erc20_`,
  NFT: `${SPECIAL_PREFIXS.TRANSFER}nft_`,
};

export const BULK_TRANSFER_CALLBACK_DATA_PREFIXS = {
  ERC20: `${SPECIAL_PREFIXS.BULK_TRANSFER}erc20_`,
  NFT: `${SPECIAL_PREFIXS.BULK_TRANSFER}nft_`,
  ADD_NEW_SECTION: `${SPECIAL_PREFIXS.BULK_TRANSFER}addNewAcction_`,
  FINISH_ADD_SECTION: `${SPECIAL_PREFIXS.BULK_TRANSFER}finish_`,
};

export const CONFIRM_TRANSACTION_CALLBACK_DATA_PREFIXS = 'ConfirmTransaction';

export const TURN_BACK_CALLBACK_DATA_KEYS = {
  BACK_TO_START: 'back_to_start',
  BACK_TO_WALLETS: 'back_to_wallets',
  BACK_TO_WALLET_FUNCTIONS: 'back_to_functions_',
  BACK_TO_PORTFOLIO: 'back_to_portfolio_',
};
