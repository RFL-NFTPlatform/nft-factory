// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./lib/RFOXNFTPresale1155.sol";
import "./structs/ParamStructs1155.sol";

contract RFOXNFTWhitelist1155 is RFOXNFTPresale1155, Initializable {

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
