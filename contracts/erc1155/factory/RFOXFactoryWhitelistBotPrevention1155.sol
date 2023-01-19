// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../RFOXNFTWhitelistBotPrevention1155.sol";

contract RFOXFactoryWhitelistBotPrevention1155 is Ownable {
    address[] public allNFTs;

    event NewRFOXNFT(address indexed nftAddress, ParamStructs1155.StandardParams params);

    function createNFT(ParamStructs1155.StandardParams calldata _params) external onlyOwner returns (address newNFT) {
        ParamStructs1155.StandardParams memory params = _params;
        bytes memory bytecode = type(RFOXNFTWhitelistBotPrevention1155).creationCode;
        bytes32 salt = keccak256(
            abi.encodePacked(allNFTs.length, params.name, params.symbol)
        );

        assembly {
            newNFT := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        RFOXNFTWhitelistBotPrevention1155(newNFT).initialize(params);

        allNFTs.push(address(newNFT));

        emit NewRFOXNFT(newNFT, params);

        return address(newNFT);
    }
}
