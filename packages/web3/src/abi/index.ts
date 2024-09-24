// SPDX-License-Identifier: MIT

import accountAbi from './json/account.abi.json';
import src5Abi from './json/src5.abi.json';
import erc20Abi from './json/erc20.abi.json';
import erc721Abi from './json/erc721.abi.json';
import erc1155Abi from './json/erc1155.abi.json';
import oldErc721Abi from './json/olderc721.abi.json';
import oldErc1155Abi from './json/olderc1155.abi.json';
import otherErc721Abi from './json/othererc721.abi.json';
import otherErc1155Abi from './json/othererc1155.abi.json';

export const ABIS = {
  AccountABI: accountAbi,
  SRC5ABI: src5Abi,
  ERC20ABI: erc20Abi,
  ERC721ABI: erc721Abi,
  ERC1155ABI: erc1155Abi,
  OldErc721ABI: oldErc721Abi,
  OldErc1155ABI: oldErc1155Abi,
  OtherErc721ABI: otherErc721Abi,
  OtherErc1155ABI: otherErc1155Abi,
};
