// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./lib/RFOXNFTSale1155.sol";
import "./structs/ParamStructs1155.sol";

contract RFOXNFTStandard1155 is RFOXNFTSale1155 {
    /**
     * @dev Initialization of the standard RFOX NFT.
     * Can only be called by the factory.
     *
     * Features:
     * Public sale.
     * No presale / whitelisted address.
     * No Bot Prevention
     *
     * @param params Struct for standard parameters.
     */
    function initialize(ParamStructs1155.StandardParams calldata params) external {
        require(msg.sender == address(factory), "Forbidden");

        initializeBase(
            params.name,
            params.symbol,
            params.baseURI,
            params.owner
        );
    }

    function updateTokenSettings(
        TokenStructs.TokenDataStandard calldata tokenData
    ) external onlyOwner {
        _updateTokenSettings(tokenData);
    }
}
