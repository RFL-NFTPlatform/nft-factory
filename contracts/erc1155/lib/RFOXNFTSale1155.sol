// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./base/BaseRFOXNFT1155.sol";

contract RFOXNFTSale1155 is BaseRFOXNFT1155 {
  /**
   * @dev Public sale.
   *
   * @param tokensNumber How many NFTs for buying this round
   * @param tokenID token ID
   */
  function buyNFTsPublic(uint256 tokensNumber, uint256 tokenID)
      external
      payable
      callerIsUser
  {
      TokenStructs.TokenDataStandard storage tokenData = dataTokens[tokenID];
      _buyNFTs(tokenData, tokensNumber);
  }
}
