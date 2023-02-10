// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../structs/TokenStructs.sol";
import "../../../interfaces/IRFOXFactory.sol";

/**
 * @dev Base Contract of RFOX NFT, which extend ERC1155
 * @dev All function stated here will become the global function which can be used by any version of RFOX NFT
 */
contract BaseRFOXNFT1155 is
    Ownable,
    ERC1155Supply
{
    using Strings for uint256;
    using SafeERC20 for IERC20;

    // token name
    string private _name;
    // token symbol
    string private _symbol;
    // Override the base uri
    string private _baseURIPrefix;
    // NFT Factory
    IRFOXFactory public factory;
    // Token Data map with the token struct data
    mapping(uint256 => TokenStructs.TokenDataStandard) public dataTokens;

    event UpdateTokenSettings(address indexed sender, uint256 indexed tokenID, TokenStructs.TokenDataStandard tokenSettings);
    event ActivateToken(address indexed sender, uint256 indexed tokenID);
    event DeactivateToken(address indexed sender, uint256 indexed tokenID);
    event UpdateURI(address indexed sender, string oldURI, string newURI);
    event Withdraw(
        address indexed sender,
        address saleToken,
        uint256 totalWithdrawn
    );

    /**
     * @dev Check if the caller is an EOA, will revert if called by contract.
     */
    modifier callerIsUser() {
        require(tx.origin == msg.sender, "Caller must be EOA");
        _;
    }

    /**
     * @dev Basic check for public & private sale requirement.
     * 1. Check whether token is active
     * 2. Check the token supply fullfillment.
     * 3. Check the maximum token number minted per tx.
     *
     * @param tokenData tokenData struct
     * @param tokensNumber token number that will be minted
     */
    function _checkBaseSaleRequirement(TokenStructs.TokenDataStandard storage tokenData, uint256 tokensNumber) internal view {
        // Check when active
        require(tokenData.active, "Token is not active");

        // Check token in supply
        require((totalSupply(tokenData.tokenID) + tokensNumber) <= tokenData.maxSupply,
            "Exceeded Max NFTs"
        );

        // Check max purchase per tx
        require(
            tokensNumber <= tokenData.maxTokensPerTransaction,
            "Max purchase per one transaction exceeded"
        );
    }

    /**
     * @dev Check for public sale requirement.
     * 1. Check the basic sale requirement.
     * 2. Check the sale start time.
     * 3. Check the sale end time.
     *
     * @notice This function can be overwritten. The original of this function is dedicated to the public sale
     * @notice But it will be overwritten for the presale NFT, because the saleStartTime has different variable.
     * 
     * @param tokenData token data struct.
     * @param tokensNumber total token that will be minted.
     */
    function _checkPublicSaleRequirement(TokenStructs.TokenDataStandard storage tokenData, uint256 tokensNumber) internal virtual view {
       _checkBaseSaleRequirement(tokenData, tokensNumber);

        // Authorize sale periode
        require(
            block.timestamp >= tokenData.saleStartTime,
            "Sale has not been started"
        );

        if (tokenData.saleEndTime > 0)
            require(block.timestamp <= tokenData.saleEndTime, "Sale has been finished");
    }

    /**
     * @dev Returns true if the tokenID is active, and false otherwise.
     *
     * @param tokenID tokenID.
     */
    function active(uint256 tokenID) external view virtual returns (bool) {
        return dataTokens[tokenID].active;
    }

    constructor() ERC1155("") {
        factory = IRFOXFactory(msg.sender);
    }

    /**
     * @dev Initialize function to setup initial value of several settings.
     *
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param baseURI_ NFT Base URI.
     * @param ownership The owner of the NFT.
     */
    function initializeBase(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address ownership
    ) internal {
        _name = name_;
        _symbol = symbol_;
        _baseURIPrefix = baseURI_;
        transferOwnership(ownership);
    }

    /**
     * @dev Update token settings. Can use this function to activate (unpaused) / deactivate (paused)
     *
     * @param tokenData struct tokenData standard
     */
    function _updateTokenSettings(
        TokenStructs.TokenDataStandard calldata tokenData
    ) internal {
        require(tokenData.saleStartTime > 0, "Invalid start time");
        require(tokenData.maxTokensPerTransaction > 0, "Max tokens per tx cannot be 0");
        require(tokenData.maxSupply > totalSupply(tokenData.tokenID), "Max supply can't be less than current total supply");

        dataTokens[tokenData.tokenID] = tokenData;
        emit UpdateTokenSettings(msg.sender, tokenData.tokenID, tokenData);
    }

    /**
     * @dev Getter for the NFT name.
     *
     * @return NFT name.
     */
    function name() external view returns (string memory) {
        return _name;
    }

    /**
     * @dev Getter for the NFT symbol.
     *
     * @return NFT symbol
     */
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Only owner can migrate base URI
     *
     * @param newBaseURIPrefix string prefix of start URI
     */
    
    function setBaseURI(string memory newBaseURIPrefix) external onlyOwner {
        string memory _oldUri = _baseURIPrefix;
        _baseURIPrefix = newBaseURIPrefix;
        emit UpdateURI(msg.sender, _oldUri, _baseURIPrefix);
    }

    function _baseURI() internal view returns (string memory) {
        return _baseURIPrefix;
    }

    /**
     * @dev Getter for the base URI.
     *
     * @return Base URI of the NFT.
     */
    function baseURI() external view returns (string memory) {
        return _baseURI();
    }

    /**
     * @dev getter for the spesific token's URI -- ID of NFTs.
     *
     * @param tokenID NFT ID.
     *
     * @return Return the token URL link.
     */
    function uri(uint256 tokenID)
        public
        view
        override(ERC1155)
        returns (string memory)
    {
        require(exists(tokenID), "ERC1155Metadata: URI query for nonexistent token");

        string memory tempBaseURI = _baseURI();
        return bytes(tempBaseURI).length > 0 ? string(abi.encodePacked(tempBaseURI, tokenID.toString())) : "";
    }

    /**
     * @dev Owner withdraw revenue from Sales
     *
     * @param token The token address that will be withdrawn.
     */
    function withdraw(address token) external onlyOwner {
        uint256 balance;
        if (token == address(0)) {
            balance = address(this).balance;
            (bool succeed,) = msg.sender.call{value: balance}(
                ""
            );
            require(succeed, "Failed to withdraw Ether");
        } else {
            balance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransfer(msg.sender, balance);
        }

        emit Withdraw(msg.sender, token, balance);
    }

    /**
     * @dev The base function for public sale purchasing.
     *
     * @notice Every contract that implement this function responsible to check the starting sale time
     * and any other conditional check.
     *
     * @param tokenData token data struct.
     * @param tokensNumber total purchased token.
     */
    function _buyNFTs(TokenStructs.TokenDataStandard storage tokenData, uint256 tokensNumber) internal {
        _checkPublicSaleRequirement(tokenData, tokensNumber);

        _mint(msg.sender, tokenData.tokenID, tokensNumber, "");

        if (address(tokenData.saleToken) == address(0)) {
            require(
                msg.value == (tokenData.tokenPrice * tokensNumber),
                "Invalid eth for purchasing"
            );
        } else {
            require(msg.value == 0, "ETH_NOT_ALLOWED");

            tokenData.saleToken.safeTransferFrom(
                msg.sender,
                address(this),
                tokenData.tokenPrice * tokensNumber
            );
        }
    }

    /**
     * @dev The shortcut function to activate the token rather than calling the updateTokenSettings function.
     *
     * @param tokenID token ID
     */
    function activateToken(uint256 tokenID) external onlyOwner {
        TokenStructs.TokenDataStandard storage tokenData = dataTokens[tokenID];
        require(!tokenData.active, "Token is active");
        tokenData.active = true;
        emit ActivateToken(msg.sender, tokenID);
    }

    /**
     * @dev The shortcut function to deactivate the token rather than calling the updateTokenSettings function.
     *
     * @param tokenID token ID
     */
    function deactivateToken(uint256 tokenID) external onlyOwner {
        TokenStructs.TokenDataStandard storage tokenData = dataTokens[tokenID];
        require(tokenData.active, "Token is inactive");
        tokenData.active = false;
        emit DeactivateToken(msg.sender, tokenID);
    }
}
