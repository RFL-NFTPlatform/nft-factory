// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INFT {
  function withdraw(address token) external;
}

contract MockReceiver1155 {
  address public NFT;

  constructor(address _NFT) {
    NFT = _NFT;
  }

  function withdraw(address token) external {
    INFT(NFT).withdraw(token);    
  }
}