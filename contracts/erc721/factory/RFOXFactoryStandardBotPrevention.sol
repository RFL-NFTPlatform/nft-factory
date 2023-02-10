// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../RFOXNFTStandardBotPrevention.sol";

contract RFOXFactoryStandardBotPrevention is Ownable {
    address[] public allNFTs;

    event NewRFOXNFT(address indexed nftAddress, ParamStructs.StandardParams params);

    function createNFT(ParamStructs.StandardParams calldata _params) external onlyOwner returns (address newNFT) {
        ParamStructs.StandardParams memory params = _params;
        bytes memory bytecode = type(RFOXNFTStandardBotPrevention).creationCode;
        bytes32 salt = keccak256(
            abi.encodePacked(allNFTs.length, params.name, params.symbol)
        );

        assembly {
            newNFT := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        RFOXNFTStandardBotPrevention(newNFT).initialize(params);

        allNFTs.push(address(newNFT));

        emit NewRFOXNFT(newNFT, params);

        return address(newNFT);
    }
}
