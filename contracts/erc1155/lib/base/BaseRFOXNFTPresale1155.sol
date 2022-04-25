// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./BaseRFOXNFT1155.sol";

/**
 * @dev The extension of the BaseRFOX standard.
 * This is the base contract for the presale / whitelist mechanism.
 */
contract BaseRFOXNFTPresale1155 is BaseRFOXNFT1155
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Token Data map with the token struct data
    mapping(uint256 => TokenStructs.PresaleSettings) public dataPresaleSettings;

    // Mapping between token id and the total token minted during presale per address
    mapping(uint256 => mapping(address => uint256)) public totalPresaleMintedPerAddress;

    event UpdatePresaleSettings(address indexed sender, uint256 indexed tokenID, TokenStructs.PresaleSettings presaleSettingsData);
    event UpdateMerkleRoot(
        address indexed sender,
        bytes32 newMerkleRoot
    );

    /**
     * @notice Requirement check for the presale.
     * 1. Check the basic sale rerquirement.
     * 2. Check if the msg.sender is whitelisted or not based on the merkletree.
     * 3. Check the saleStartTime.
     * 3. Check the sale end time.
     *
     * @param proof Array of the merkle tree proof, to check if the sender is whitelisted or not.
     */
    function _checkPresaleRequirement(TokenStructs.TokenDataStandard storage tokenData, TokenStructs.PresaleSettings storage presaleSettingsData, uint256 tokensNumber, bytes32[] calldata proof) internal view {
        _checkBaseSaleRequirement(tokenData, tokensNumber);
        require(
          (_checkWhitelisted(presaleSettingsData, msg.sender, proof) && block.timestamp >= tokenData.saleStartTime),
          "Unauthorized to join the presale"
        );

        if (tokenData.saleEndTime > 0)
            require(block.timestamp <= tokenData.saleEndTime, "Sale has been finished");
    }

    /**
     * @notice Base function to process the presale transaction submitted by the whitelisted address.
     * Each whitelisted address has quota to mint for the presale.
     * There is limit amount of token that can be minted during the presale.
     *
     * @param tokenData tokenData struct.
     * @param presaleSettingsData presale setting data struct.
     * @param tokensNumber How many NFTs for buying this round.
     * @param proof address proof for the merkle tree.
     */
    function _buyNFTsPresale(TokenStructs.TokenDataStandard storage tokenData, TokenStructs.PresaleSettings storage presaleSettingsData, uint256 tokensNumber, bytes32[] calldata proof) internal {
        _checkPresaleRequirement(tokenData, presaleSettingsData, tokensNumber, proof);

        // Check & Add total minted during presale by address
        uint256 totalPresaleMintedByAddress = totalPresaleMintedPerAddress[tokenData.tokenID][msg.sender];
        require(totalPresaleMintedByAddress.add(tokensNumber) <= presaleSettingsData.maxMintedPresalePerAddress, "Exceed the limit");

        totalPresaleMintedPerAddress[tokenData.tokenID][msg.sender] = totalPresaleMintedByAddress.add(tokensNumber);

        if (address(tokenData.saleToken) == address(0)) {
            require(
                msg.value == presaleSettingsData.tokenPricePresale.mul(tokensNumber),
                "Invalid eth for purchasing"
            );
        } else {
            require(msg.value == 0, "ETH_NOT_ALLOWED");

            tokenData.saleToken.safeTransferFrom(
                msg.sender,
                address(this),
                presaleSettingsData.tokenPricePresale.mul(tokensNumber)
            );
        }

        _mint(msg.sender, tokenData.tokenID, tokensNumber, "");
    }

    /**
     * @dev Update the merkle root for the whitelist tree.
     * If the whitelist changed, then need to update the hash root.
     *
     * @param _merkleRoot new hash of the root.
     * @param tokenID token ID.
     */
    function updateMerkleRoot(bytes32 _merkleRoot, uint256 tokenID) external onlyOwner {
        TokenStructs.PresaleSettings storage presaleSettingsData = dataPresaleSettings[tokenID];
        presaleSettingsData.merkleRoot = _merkleRoot;
        emit UpdateMerkleRoot(msg.sender, _merkleRoot);
    }

    /**
     * @dev internal function to update the presaleSettings data.
     *
     * @param presaleSettingsData presaleSettingsData struct.
     */
    function _updatePresaleSettings(uint256 tokenID, TokenStructs.PresaleSettings calldata presaleSettingsData) internal {
        dataPresaleSettings[tokenID] = presaleSettingsData;
        emit UpdatePresaleSettings(msg.sender, tokenID, presaleSettingsData);
    }

    /**
     * @dev Getter for the hash of the address.
     *
     * @param account The address to be checked.
     *
     * @return The hash of the address
     */
    function _leaf(address account) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account));
    }

    /**
     * @dev Check if the particular address is whitelisted or not.
     *
     * @param tokenID token ID.
     * @param account The address to be checked. 
     * @param proof The bytes32 array from the offchain whitelist address.
     *
     * @return true / false.
     */
    function checkWhitelisted(uint256 tokenID, address account, bytes32[] calldata proof)
        public
        view
        returns (bool)
    {
        TokenStructs.PresaleSettings storage presaleSettingsData = dataPresaleSettings[tokenID];
        return _checkWhitelisted(presaleSettingsData, account, proof);
    }

    /**
     * @dev internal function to check the whitelist.
     *
     * @param presaleSettingsData presaleSettingsData strruct.
     * @param account address that will be checked.
     * @param proof Proof of address for the merkle tree.
     */
    function _checkWhitelisted(TokenStructs.PresaleSettings storage presaleSettingsData, address account, bytes32[] calldata proof) internal view returns (bool) {
      bytes32 leaf = _leaf(account);
      return MerkleProof.verify(proof, presaleSettingsData.merkleRoot, leaf);
    }
}
