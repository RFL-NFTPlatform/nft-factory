# Introduction

MissPH NFTs from RFOX Labs

# GIT rules
- Release branch: master
- Develop branch: develop

- All of the code need to create pull request to develop and assign to at least one reviewer.
- All pull request must be approved by reviewer before merge
- New feature should be develop on its own branch then make a PR to develop branch for review


## Plugins

missPH is currently extended with the following plugins.
Instructions on how to use them in your own application are linked below.
Plugin should import from hardhat.config.js

| Plugin | npm |
| ------ | ------ |
| hardhat-waffle |  https://www.npmjs.com/package/@nomiclabs/hardhat-waffle|
| hardhat-ethers | https://www.npmjs.com/package/@nomiclabs/hardhat-ethers|
| hardhat-etherscan | https://www.npmjs.com/package/@nomiclabs/hardhat-etherscan |
| hardhat-upgrades | https://www.npmjs.com/package/@openzeppelin/hardhat-upgrades |
| hardhat-abi-exporter | https://www.npmjs.com/package/hardhat-abi-exporter |
| hardhat-contract-sizer | https://www.npmjs.com/package/hardhat-contract-sizer |
| hardhat-deploy | https://www.npmjs.com/package/hardhat-deploy |
| hardhat-gas-reporter | https://www.npmjs.com/package/hardhat-gas-reporter |
| solidity-coverage | https://www.npmjs.com/package/solidity-coverage |

## Components 

  ### Interfaces

  ### Libraries

   - Ownable is a standard OpenZeppelin contract for access control with an owner role.
   - Pausable Contract module which allows children to implement an emergency stop mechanism that can be triggered by an authorized account.
   - Counters: Provides counters that can only be incremented or decremented by one. This can be used e.g. to track the number of elements in a mapping, issuing ERC721 ids, or counting request ids.

### Requirement for compilation & testing
   - Install dependencies (npm install)
   - Add override keyword in node_modules/erc721a/contracts/ERC721A.sol\
     function setApprovalForAll(address operator, bool approved) public virtual `override`\
     function approve(address to, uint256 tokenId) public virtual `override`
   - run ganache `ganache-cli`
   - hardhat test / npm run test

