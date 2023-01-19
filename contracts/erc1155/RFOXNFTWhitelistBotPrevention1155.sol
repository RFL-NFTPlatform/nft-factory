// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./lib/RFOXNFTSignaturePresale1155.sol";
import "./structs/ParamStructs1155.sol";

contract RFOXNFTWhitelistBotPrevention1155 is RFOXNFTSignaturePresale1155 {

    /**
     * @dev Initialization of the RFOX NFT with presale / whitelist mechanism.
     * Can only be called by the factory.
     *
     * Features:
     * Public sale.
     * Presale / whitelisted address.
     * No Bot Prevention.
     *
     * @param params Struct for whitelist parameters.
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
        TokenStructs.TokenDataStandard calldata tokenData,
        TokenStructs.PresaleSettings calldata presaleSettingsData
    ) external onlyOwner {
        require(
            presaleSettingsData.publicSaleStartTime >= tokenData.saleStartTime,
            "Invalid public sale time"
        );

        _updateTokenSettings(tokenData);
        _updatePresaleSettings(tokenData.tokenID, presaleSettingsData);
    }
}
