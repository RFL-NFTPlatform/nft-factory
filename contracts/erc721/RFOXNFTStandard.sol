// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./lib/RFOXNFTSale.sol";
import "./structs/ParamStructs.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract RFOXNFTStandard is RFOXNFTSale, Initializable {
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
    function initialize(ParamStructs.StandardParams calldata params) external initializer  {
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
