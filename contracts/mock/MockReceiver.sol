// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INFT {
  function withdraw() external;
}

contract MockReceiver {
  address public NFT;

  constructor(address _NFT) {
    NFT = _NFT;
  }

  function withdraw() external {
    INFT(NFT).withdraw();    
  }
}