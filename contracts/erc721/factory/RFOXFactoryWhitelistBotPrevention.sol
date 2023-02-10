// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../RFOXNFTWhitelistBotPrevention.sol";

contract RFOXFactoryWhitelistBotPrevention is Ownable {
    address[] public allNFTs;

    event NewRFOXNFT(address indexed nftAddress, ParamStructs.WhitelistParams params);

    function createNFT(ParamStructs.WhitelistParams calldata _params) external onlyOwner returns (address newNFT) {
        ParamStructs.WhitelistParams memory params = _params;
        bytes memory bytecode = type(RFOXNFTWhitelistBotPrevention).creationCode;
        bytes32 salt = keccak256(
            abi.encodePacked(allNFTs.length, params.name, params.symbol)
        );

        assembly {
            newNFT := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        allNFTs.push(address(newNFT));

        RFOXNFTWhitelistBotPrevention(newNFT).initialize(params);

        emit NewRFOXNFT(newNFT, params);

        return address(newNFT);
    }
}
