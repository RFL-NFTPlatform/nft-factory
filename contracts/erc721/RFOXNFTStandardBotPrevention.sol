// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./lib/RFOXNFTSignatureSale.sol";
import "./structs/ParamStructs.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract RFOXNFTStandardBotPrevention is RFOXNFTSignatureSale, Initializable {
    /**
     * @dev Initialization of the standard RFOX NFT with bot prevention.
     * Can only be called by the factory.
     *
     * Features:
     * Public sale.
     * Bot Prevention
     * No presale / whitelisted address.
     *
     * @param params Struct for standard parameters.
     */
    function initialize(ParamStructs.StandardParams calldata params) external initializer {
        require(msg.sender == address(factory), "Forbidden");

        initializeBase(
            params.name,
            params.symbol,
            params.baseURI,
            params.saleToken,
            params.price,
            params.maxNft,
            params.maxTokensPerTransaction,
            params.saleStartTime,
            params.saleEndTime,
            params.owner
        );
    }
}
