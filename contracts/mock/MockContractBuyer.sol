// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IRFOXNFT {
  function buyNFTsPresale(uint256 tokensNumber, bytes32[] calldata proof) external;
  function buyNFTsPresale(uint256 tokensNumber, bytes32[] calldata proof, uint256 salt, bytes calldata signature) external;
  function buyNFTsPublic(uint256 tokensNumber) external;
  function buyNFTsPublic(uint256 tokensNumber, uint256 salt, bytes calldata signature) external;
}

contract MockContractBuyer {
  IRFOXNFT rfoxNFT;
  constructor(IRFOXNFT _rfoxNFT) {
    rfoxNFT = _rfoxNFT;
  }
  function mockBuyNFTSPresale(uint256 tokensNumber) external {
    bytes32[] memory proof;
    rfoxNFT.buyNFTsPresale(tokensNumber, proof);
  }

  function mockBuyNFTSPresaleSignature(uint256 tokensNumber, uint256 salt, bytes calldata signature) external {
    bytes32[] memory proof;
    rfoxNFT.buyNFTsPresale(tokensNumber, proof, salt, signature);
  }

  function mockBuyNFTSPublic(uint256 tokensNumber) external {
    rfoxNFT.buyNFTsPublic(tokensNumber);
  }

  function mockBuyNFTSPublicSignature(uint256 tokensNumber, uint256 salt, bytes calldata signature) external {
    rfoxNFT.buyNFTsPublic(tokensNumber, salt, signature);
  }
}