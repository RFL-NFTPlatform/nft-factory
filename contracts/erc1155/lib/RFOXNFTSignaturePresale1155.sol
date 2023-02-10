// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./RFOXNFTSignatureSale1155.sol";
import "./base/BaseRFOXNFTPresale1155.sol";

contract RFOXNFTSignaturePresale1155 is RFOXNFTSignatureSale1155, BaseRFOXNFTPresale1155
{
    /**
     * @dev Check if the total mint target will exceed the total suply of NFT.
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
     * @param salt The unique value to prevent doubled used of signature.
     * @param signature Signature of the signer address.
     */
    function buyNFTsPresale(uint256 tokensNumber, uint256 tokenID, bytes32[] calldata proof, uint256 salt, bytes calldata signature)
        external
        payable
        callerIsUser
        checkUsedSignature(signature)
    {
        require(_isValidSignature(keccak256(abi.encodePacked(msg.sender,address(this),salt)), signature), "Invalid signature");
        usedSignature[signature] = true;

        TokenStructs.TokenDataStandard storage tokenData = dataTokens[tokenID];
        TokenStructs.PresaleSettings storage presaleSettingsData = dataPresaleSettings[tokenID];
        _buyNFTsPresale(tokenData, presaleSettingsData, tokensNumber, proof);
    }
}
