// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library TokenStructs {
  /**
   * @dev Struct data for each Standard Token ID
   *
   * @param tokenID Token ID.
   * @param maxTokensPerTransaction max tokens per minting tx
   * @param tokenPrice token price
   * @param maxSupply Total supply for each token
   * @param saleStartTime Public start time for minting
   * @param saleEndTime End time public sale
   * @param saleToken Token used for payment minting
   * @param active Pause flag for presale & public sale
   */
  struct TokenDataStandard {
    uint256 tokenID;
    uint256 maxTokensPerTransaction;
    uint256 tokenPrice;
    uint256 maxSupply;
    uint256 saleStartTime;
    uint256 saleEndTime;
    IERC20 saleToken;
    bool active;
  }

  /**
   * @dev Struct data for each Presale supported Token ID
   *
   * @param publicSaleStartTime End of private sale, start of public sale
   * @param maxMintedPresalePerAddress Maximum minted per address during presale
   * @param tokenPricePresale Price of presale minting
   * @param merkleRoot whitelisted addresses for each token minting
   */
  struct PresaleSettings {
    uint256 publicSaleStartTime;
    uint256 maxMintedPresalePerAddress;
    uint256 tokenPricePresale;
    bytes32 merkleRoot;
  }
}