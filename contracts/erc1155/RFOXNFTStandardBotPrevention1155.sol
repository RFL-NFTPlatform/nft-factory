// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./lib/RFOXNFTSignatureSale1155.sol";
import "./structs/ParamStructs1155.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract RFOXNFTStandardBotPrevention1155 is RFOXNFTSignatureSale1155, Initializable {
    /**
     * @dev Initialization of the standard RFOX NFT.
     * Can only be called by the factory.
     *
     * Features:
     * Public sale.
     * No presale / whitelisted address.
     * Bot Prevention
     *
     * @param params Struct for standard parameters.
     */
    function initialize(ParamStructs1155.StandardParams calldata params) external initializer {
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
