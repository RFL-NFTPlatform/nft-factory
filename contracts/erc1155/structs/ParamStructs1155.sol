// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library ParamStructs1155 {
  /**
    * @dev Parameters for Standard Feature.
    *
    * @param name NFT name.
    * @param symbol NFT symbol.
    * @param baseURI NFT base uri.
    * @param owner The owner of the token.
  */
  struct StandardParams {
    string name;
    string symbol;
    string baseURI;
    address owner;
  }
}