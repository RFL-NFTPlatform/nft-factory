// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRFOXNFT {
  function buyNFTsPresale(uint256 tokensNumber, uint256 tokenID, bytes32[] calldata proof) external;
  function buyNFTsPresale(uint256 tokensNumber, uint256 tokenID, bytes32[] calldata proof, uint256 salt, bytes calldata signature) external;
  function buyNFTsPublic(uint256 tokensNumber, uint256 tokenID) external;
  function buyNFTsPublic(uint256 tokensNumber, uint256 tokenID, uint256 salt, bytes calldata signature) external;
}

contract MockContractBuyer1155 {
  IRFOXNFT rfoxNFT;
  constructor(IRFOXNFT _rfoxNFT) {
    rfoxNFT = _rfoxNFT;
  }
  function mockBuyNFTSPresale(uint256 tokensNumber, uint256 tokenID) external {
    bytes32[] memory proof;
    rfoxNFT.buyNFTsPresale(tokensNumber, tokenID, proof);
  }

  function mockBuyNFTSPresaleSignature(uint256 tokensNumber,  uint256 tokenID, uint256 salt, bytes calldata signature) external {
    bytes32[] memory proof;
    rfoxNFT.buyNFTsPresale(tokensNumber, tokenID, proof, salt, signature);
  }

  function mockBuyNFTSPublic(uint256 tokensNumber, uint256 tokenID) external {
    rfoxNFT.buyNFTsPublic(tokensNumber, tokenID);
  }

  function mockBuyNFTSPublicSignature(uint256 tokensNumber,  uint256 tokenID, uint256 salt, bytes calldata signature) external {
    rfoxNFT.buyNFTsPublic(tokensNumber, tokenID, salt, signature);
  }
}