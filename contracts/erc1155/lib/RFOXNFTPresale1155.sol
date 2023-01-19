// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./RFOXNFTSale1155.sol";
import "./base/BaseRFOXNFTPresale1155.sol";

contract RFOXNFTPresale1155 is RFOXNFTSale1155, BaseRFOXNFTPresale1155
{
    /**
     * @dev This is the function that overwrite the original _checkPublicSaleRequirement from the public sale.
     * @dev This function is dedicate to presale NFT contract. So will need to overwrite the public sale start time variable.
     *
     * @param tokenData token data struct.
     * @param tokensNumber total token that will be minted.
     */
    function _checkPublicSaleRequirement(TokenStructs.TokenDataStandard storage tokenData, uint256 tokensNumber) internal override view {
       _checkBaseSaleRequirement(tokenData, tokensNumber);

        // Authorize sale periode
        require(
            block.timestamp >= dataPresaleSettings[tokenData.tokenID].publicSaleStartTime,
            "Sale has not been started"
        );

        if (tokenData.saleEndTime > 0)
            require(block.timestamp <= tokenData.saleEndTime, "Sale has been finished");
    }

    /**
     * @dev Each whitelisted address has quota to mint for the presale.
     * There is limit amount of token that can be minted during the presale.
     *
     * @param tokensNumber How many NFTs for buying this round.
     * @param tokenID token ID.
     * @param proof The bytes32 array from the offchain whitelist address.
     */
    function buyNFTsPresale(uint256 tokensNumber, uint256 tokenID, bytes32[] calldata proof)
        external
        payable
        callerIsUser
    {
        TokenStructs.TokenDataStandard storage tokenData = dataTokens[tokenID];
        TokenStructs.PresaleSettings storage presaleSettingsData = dataPresaleSettings[tokenID];
        _buyNFTsPresale(tokenData, presaleSettingsData, tokensNumber, proof);
    }
}
