const { expect } = require("chai");
const { expectRevert, constants } = require("@openzeppelin/test-helpers");
const { waffle} = require("hardhat");
const { shouldSupportInterfaces } = require('../SupportsInterface.behavior');
const { buildParamsStandard1155, buildTokenSettings1155, buildPresaleSettings1155 } = require("../helpers/lib");
const NFTContract = artifacts.require("RFOXNFTWhitelistBotPrevention1155");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

const wei = web3.utils.toWei;
const provider = waffle.provider;
const salt = 1234567
let globalContractAddress;

const getSignature = async function (senderAddress, privKey, newSalt = null) {
  let _salt = newSalt ? newSalt : salt
  const hashMsg = web3.utils.soliditySha3(senderAddress, globalContractAddress, _salt);
  const signature = await web3.eth.accounts.sign(hashMsg, privKey);
  return signature;
}

const whitelistAddresses = async function(nftContract, tokenID, whitelistedAddresses) {
  const leafNodes = whitelistedAddresses.map(addr => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
  const rootHash = merkleTree.getRoot();
  const completeRootHash = '0x' + rootHash.toString('hex');

  if(whitelistedAddresses.length > 0) {
    const proof = merkleTree.getHexProof(keccak256(whitelistedAddresses[0]));
    expect(await nftContract.checkWhitelisted(tokenID, whitelistedAddresses[0], proof)).to.equal(false);
  
    await nftContract.updateMerkleRoot(completeRootHash, tokenID);
    expect( (await nftContract.dataPresaleSettings(tokenID)).merkleRoot).to.equal(completeRootHash);
  
    expect(await nftContract.checkWhitelisted(tokenID, whitelistedAddresses[0], proof)).to.equal(true);
  } else {
    await nftContract.updateMerkleRoot(constants.ZERO_BYTES32, tokenID);
  }

  return merkleTree;
}

const getWhitelistProof = async function (merkleTree, address) {
  return merkleTree.getHexProof(keccak256(address));
}

describe("Miss PH NFTWhitelistSignature1155", function () {
  console.log("Starting NFTWhitelistSignature1155...");
  let RFOXFactory, nftContract, missAny, token, owner, bob, jane, sara, saleStartTime, saleEndTime, maxSupplyPerToken;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const id1 = 0;
  const id2 = 124;
  const maxNfts = 20;

  const tokenURI = "ipfs://";

  const price = ethers.utils.parseUnits("100", 18);
  const tokenName = "MissUniversePh";
  const tokenSymbol = "MISSUPH";

  let signerAccount, signerPrivKey, signerAddress;

  before(async () => {
		signerAccount = await web3.eth.accounts.create();
    signerPrivKey = signerAccount.privateKey;
    signerAddress = signerAccount.address;
	});

  beforeEach(async () => {
    [owner, bob, jane, sara] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    token = await MockToken.deploy();
    await token.deployed();

    const RFOXNFTFactory = await ethers.getContractFactory(
      "RFOXFactoryWhitelistBotPrevention1155"
    );
    RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    saleStartTime = Math.round(Date.now() / 1000); // current time
    saleEndTime = (Math.round(Date.now() / 1000) + 172800); // next 2 day
    maxSupplyPerToken = 20;

    let params = buildParamsStandard1155(
      tokenName,
      tokenSymbol,
      tokenURI,
      owner.address
    );

    let tokenSettingsData = buildTokenSettings1155(
      0,
      10,
      price,
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      0,
      price,
      constants.ZERO_BYTES32,
    )

    await RFOXFactory.createNFT(params);

    nftContract = await ethers.getContractFactory("RFOXNFTWhitelistBotPrevention1155");
    missAny = await nftContract.attach(await RFOXFactory.allNFTs(0));

    globalContractAddress = missAny.address;

    await missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData);
    await missAny.changeAuthorizedSignerAddress(signerAddress);
  });

  it("correctly NFT name", async function () {
    expect(await missAny.name()).to.be.equal(tokenName);
    expect(await missAny.symbol()).to.be.equal(tokenSymbol);
    await expectRevert(missAny.uri(0), "ERC1155Metadata: URI query for nonexistent token");
    expect(await missAny.owner()).to.be.equal(owner.address);
  });

  it("throws when initialize the NFTs from unauthorized factory", async function() {
    let params = buildParamsStandard1155(
      "TEST",
      "TEST",
      tokenURI,
      owner.address
    );

    await expectRevert(missAny.initialize(params), "Forbidden")
  })

  it("throws when initialize the NFTs with invalid period", async function() {
    tokenSettingsData = buildTokenSettings1155(
      0,
      10,
      price,
      maxSupplyPerToken,
      0,
      0,
      token.address,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await expectRevert(missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData), "Invalid start time");
  })

  it("initialize with empty sale end time", async function() {
    let params = buildParamsStandard1155(
      "TEST",
      "TEST",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);
  })

  it("initialize with active sale end time", async function() {
    let params = buildParamsStandard1155(
      "TEST",
      "TEST",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);
  })

  it("throws when trying to get count of NFTs owned by 0x0 address", async function () {
    await expectRevert(missAny.balanceOf(zeroAddress, 0), "ERC1155: address zero is not a valid owner");
  });

  it("throws when trying to transfer an invalid balance", async function () {
    await expectRevert(missAny.connect(bob).safeTransferFrom(bob.address, sara.address, id1, 100, "0x"), "ERC1155: insufficient balance for transfer")
  });

  it("throws when trying to transfer an invalid NFT", async function () {
    await expectRevert(missAny.connect(bob).safeTransferFrom(jane.address, sara.address, id1, 100, "0x"), "ERC1155: caller is not token owner or approved")
  });

  it("Only owner can create NFT contract", async function () {
    const RFOXNFTFactory = await ethers.getContractFactory(
      "RFOXFactoryStandard1155"
    );
    const RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    let params = buildParamsStandard1155(
      tokenName,
      tokenSymbol,
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    await expectRevert(RFOXFactory.connect(bob).createNFT(params), "Ownable: caller is not the owner");
  });

  it("Only owner can create multiple NFTs contract", async function () {
    const RFOXNFTFactory = await ethers.getContractFactory(
      "RFOXFactoryStandard1155"
    );
    const RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    for (let i = 0; i < 10; i++) {
      let params = buildParamsStandard1155(
        tokenName + i,
        tokenSymbol,
        tokenURI,
        owner.address
      );

      await RFOXFactory.createNFT(params);
    }
  });

  it("Update base URI", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    await expectRevert(missAny.connect(bob).setBaseURI("updatedLink"), "Ownable: caller is not the owner");
    await missAny.setBaseURI("updatedLink");
    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    expect(await missAny.uri(0)).to.equal("updatedLink0");
    expect(await missAny.baseURI()).to.equal("updatedLink");
  })

  it("Update token settings should fail if publicSaleStartTime <= private sale start time", async function() {
    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      maxSupplyPerToken,
      saleEndTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleEndTime-1, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await expectRevert(missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData), "Invalid public sale time");
  })

  it("Can mint NFTs", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(10);
  });

  it("Changing maxSupply of NFT less than the current total supply should fail", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(10);

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      0,
      saleEndTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    );

    let presaleSettingsData = buildPresaleSettings1155(
      saleEndTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await expectRevert(missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData), "Max supply can't be less than current total supply");
  });

  it("Can't mint for non active token", async function () {
    const nonActiveTokenID = 1;
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(missAny.buyNFTsPublic(10, nonActiveTokenID, salt, sign.signature), "Token is not active");
    expect(await missAny.balanceOf(owner.address, nonActiveTokenID)).to.be.equal(0);
  });

  it("Can't mint NFTs if has not enough token approval", async function () {
    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(missAny.buyNFTsPublic(10, id1, salt, sign.signature), "ERC20: insufficient allowance");
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(0);
  });

  it("Mint NFTs should failed if exceed the total limit per one tx", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(missAny.buyNFTsPublic(20, id1, salt, sign.signature), "Max purchase per one transaction exceeded");
  });

  it("Mint NFTs should failed if has not been started", async function () {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      maxSupplyPerToken,
      saleEndTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleEndTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    await token.approve(
      missAnyWithETH.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature), "Sale has not been started");
  });

  it("Mint NFTs should failed if sale has been finished", async function () {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      maxSupplyPerToken,
      saleStartTime,
      saleStartTime,
      constants.ZERO_ADDRESS,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    await token.approve(
      missAnyWithETH.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature), "Sale has been finished");
  });

  it("Cannot mint exceed max NFTs case 1", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const salt2 = 123456789
    const salt3 = 111;
    const sign = (await getSignature(owner.address, signerPrivKey));
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2)
    const sign3 = (await getSignature(owner.address, signerPrivKey, salt3));

    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    await missAny.buyNFTsPublic(10, id1, salt2, sign2.signature);
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(20);
    await expect(missAny.buyNFTsPublic(1, id1, salt3, sign3.signature)).to.be.revertedWith(
      "Exceeded Max NFTs"
    );
  });

  it("Cannot mint exceed max NFTs case 2", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const salt2 = 123456789
    const salt3 = 111;
    const sign = (await getSignature(owner.address, signerPrivKey));
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2)
    const sign3 = (await getSignature(owner.address, signerPrivKey, salt3));

    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    await missAny.buyNFTsPublic(5, id1, salt2, sign2.signature);
    await expect(missAny.buyNFTsPublic(10, id1, salt3, sign3.signature)).to.be.revertedWith(
      "Exceeded Max NFTs"
    );
  });

  it("Correct totalSupply", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(10);
    expect(await missAny.totalSupply(id1)).to.be.equal(10);
  });

  it("Pause the NFT contract", async function() {
    await expectRevert(missAny.connect(bob).deactivateToken(id1), "Ownable: caller is not the owner")
    await expectRevert(missAny.activateToken(id1), "Token is active")
    await missAny.deactivateToken(id1);

    let tokenData = await missAny.dataTokens(id1);
    expect(tokenData.active).to.equal(false)
    expect(await missAny.active(id1)).to.equal(false);

    // Unpause
    await expectRevert(missAny.connect(bob).activateToken(id1), "Ownable: caller is not the owner")
    await expectRevert(missAny.deactivateToken(id1), "Token is inactive")
    await missAny.activateToken(id1);
    tokenData = await missAny.dataTokens(id1);
    expect(tokenData.active).to.equal(true)
    expect(await missAny.active(id1)).to.equal(true);
  })

  it("Test Update token settings", async function() {
    const newTokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address,
      false
    );

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAny.updateTokenSettings(newTokenSettingsData, presaleSettingsData);

    const tokenSettingsData = await missAny.dataTokens(id1);
    expect(tokenSettingsData.tokenID).to.equal(newTokenSettingsData.tokenID);
    expect(tokenSettingsData.maxTokensPerTransaction).to.equal(newTokenSettingsData.maxTokensPerTransaction);
    expect(tokenSettingsData.tokenPrice).to.equal(newTokenSettingsData.tokenPrice);
    expect(tokenSettingsData.maxSupply).to.equal(newTokenSettingsData.maxSupply);
    expect(tokenSettingsData.saleStartTime).to.equal(newTokenSettingsData.saleStartTime);
    expect(tokenSettingsData.saleEndTime).to.equal(newTokenSettingsData.saleEndTime);
    expect(tokenSettingsData.saleToken).to.equal(newTokenSettingsData.saleToken);
    expect(tokenSettingsData.active).to.equal(newTokenSettingsData.active);
  })

  it("Purchasing with ETH should failed if ETH is invalid", async function() {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    const sign = (await getSignature(owner.address, signerPrivKey));

    await expectRevert(missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("11", "wei")}), "Invalid eth for purchasing");
    await expectRevert(missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("9", "wei")}), "Invalid eth for purchasing");
  })

  it("Purchasing NFT with eth", async function() {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    const initialETHBalance = await provider.getBalance(missAnyWithETH.address);
    console.log(initialETHBalance.toString());

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "wei"), // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    const sign = (await getSignature(owner.address, signerPrivKey));

    await missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("10", "wei")});
    const latestETHBalance = await provider.getBalance(missAnyWithETH.address);

    expect(latestETHBalance).to.equal(wei("10", "wei"));
  })

  it("Purchasing NFT with eth (without sale end time)", async function() {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "wei"), // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      0,
      constants.ZERO_ADDRESS,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    const initialETHBalance = await provider.getBalance(missAnyWithETH.address);
    console.log(initialETHBalance.toString());

    const sign = (await getSignature(owner.address, signerPrivKey));
    await missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("10", "wei")});
    const latestETHBalance = await provider.getBalance(missAnyWithETH.address);

    expect(latestETHBalance).to.equal(wei("10", "wei"));
  })

  it("Purchasing NFT with eth should be failed if sale token is set", async function() {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      0,
      token.address,
      true
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    const initialETHBalance = await provider.getBalance(missAnyWithETH.address);
    console.log(initialETHBalance.toString());

    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("10", "wei")}), "ETH_NOT_ALLOWED");
  })

  it("Withdraw eth", async function() {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    const initialETHBalance = await provider.getBalance(missAnyWithETH.address);
    expect(initialETHBalance).to.equal(0);
    const initialOwnerETHBalance = await provider.getBalance(owner.address);

    const sign = (await getSignature(sara.address, signerPrivKey));
    await missAnyWithETH.connect(sara).buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("10", "ether")});
    let latestETHBalance = await provider.getBalance(missAnyWithETH.address);

    expect(latestETHBalance).to.equal(wei("10", "ether"));
    
    const tx = await missAnyWithETH.connect(owner).withdraw(constants.ZERO_ADDRESS);
    const receipt = await tx.wait();
    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

    latestETHBalance = await provider.getBalance(missAnyWithETH.address);
    const latestOwnerETHBalance = await provider.getBalance(owner.address);

    expect(latestETHBalance).to.equal(0);
    expect(latestOwnerETHBalance).to.equal(initialOwnerETHBalance.add(ethers.BigNumber.from(wei("10", "ether")).sub(txFee) ))
  })

  it("Withdraw token", async function () {
    const totalTokenApproved = wei("1000", "ether");
    await token.approve(
      missAny.address,
      totalTokenApproved
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    expect(await token.balanceOf(missAny.address)).to.equal(0);
    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(10);
    expect( (await token.balanceOf(missAny.address)).toString()).to.equal(totalTokenApproved)

    await missAny.transferOwnership(sara.address);
    expect(await missAny.owner()).to.equal(sara.address);

    await missAny.connect(sara).withdraw(token.address);
    expect( (await token.balanceOf(missAny.address)).toString()).to.equal("0")
    expect( (await token.balanceOf(sara.address)).toString()).to.equal(totalTokenApproved)
  });

  it("Withdraw should failed if called from unauthorized owner", async function() {
    const MockReceiver = await ethers.getContractFactory("MockERC20");
    const receiverContract = await MockReceiver.deploy();
    await token.deployed();
    await missAny.transferOwnership(receiverContract.address);
    expect(await missAny.owner()).to.equal(receiverContract.address);
    await expectRevert(missAny.withdraw(token.address), "Ownable: caller is not the owner");
  })

  it("Withdraw eth failed", async function() {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    const sign = (await getSignature(sara.address, signerPrivKey));
    await missAnyWithETH.connect(sara).buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("10", "ether")});

    const MockReceiver = await ethers.getContractFactory("MockReceiver1155");
    const receiverContract = await MockReceiver.deploy(missAnyWithETH.address);
    await receiverContract.deployed();

    expect(await receiverContract.NFT()).to.equal(missAnyWithETH.address);
    await missAnyWithETH.transferOwnership(receiverContract.address);
    expect(await missAnyWithETH.owner()).to.equal(receiverContract.address);
    await expectRevert(receiverContract.withdraw(constants.ZERO_ADDRESS), "Failed to withdraw Ether");
  })

  it("Supports interface", async function(){
    const nftContract = await NFTContract.at(missAny.address);
    shouldSupportInterfaces(nftContract, [
      'ERC1155',
    ]);
  })

  it("Update token settings should fail if called by non-owner", async() => {
    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await expectRevert(missAny.connect(bob).updateTokenSettings(tokenSettingsData, presaleSettingsData), "Ownable: caller is not the owner");
  })

  it("Update token settings should fail if max token per tx is set to zero", async() => {
    let tokenSettingsData = buildTokenSettings1155(
      id1,
      0,
      wei("1", "ether"), // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await expectRevert(missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData), "Max tokens per tx cannot be 0");
  })

  it("Minting public from contract should fail", async function() {
    MockContractBuyer = await ethers.getContractFactory("MockContractBuyer1155");
    mockContractBuyer = await MockContractBuyer.deploy(missAny.address);
    const sign = (await getSignature(owner.address, signerPrivKey));
    await mockContractBuyer.deployed();
    await expectRevert(mockContractBuyer.mockBuyNFTSPublicSignature(1, id1, salt, sign.signature), "Caller must be EOA");
  })

  // Whitelist
  it("Unwhitelist Can't mint NFTs from the presale", async function () {
    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address, // 1 ether,
      true
    )
    

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(missAny.buyNFTsPresale(10, id1, [], salt, sign.signature), "Unauthorized to join the presale");
  });

  it("Whitelisted address Can mint NFTs before public start sale started and after presale started", async function () {
    let params = buildParamsStandard1155(
      "TEST",
      "TEST",
      tokenURI,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAny2.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address, // 1 ether,
      true
    )
    

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime + 3600, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAny2.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    await whitelistAddresses(missAny2, id1, [bob.address]);

    const salt2 = 123456789
    const salt3 = 111;
    const salt4 = 99;
    const sign = (await getSignature(bob.address, signerPrivKey));
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2)
    const sign3 = (await getSignature(bob.address, signerPrivKey, salt3));
    const sign4 = (await getSignature(bob.address, signerPrivKey, salt4));

    // Should revert presale tx if signature is wrong
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, id1, [], 100, sign.signature), "Invalid signature");
    await missAny2.connect(bob).buyNFTsPresale(3, id1, [], salt, sign.signature);

    // Cannot use the same signature for presale
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, id1, [], salt, sign.signature), "Signature has been used");

    await missAny2.connect(bob).buyNFTsPresale(2, id1, [], salt3, sign3.signature);

    expect(await missAny2.balanceOf(bob.address, id1)).to.be.equal(5);
    await expectRevert(missAny2.buyNFTsPresale(10, id1, [], salt2, sign2.signature), "Unauthorized to join the presale");

    // Should revert if mint the presale exceed the limit
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, id1, [], salt4, sign4.signature), "Exceed the limit");
  });

  it("Whitelisted address Can't mint NFTs if the quota for presale is full", async function () {
    maxSupplyPerToken = 10;
    let params = buildParamsStandard1155(
      tokenName,
      tokenSymbol,
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAny2.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price, // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime + 3600, // publicsaleStartTime
      0,
      price,
      constants.ZERO_BYTES32,
    )

    await missAny2.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("5000000"));
    await token.connect(bob).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("5000000")
    );
    await token.transfer(sara.address, hre.ethers.utils.parseUnits("5000000"));
    await token.connect(sara).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("5000000")
    );


    let whitelistSettingsOnchain = await missAny2.dataPresaleSettings(id1);
    expect( whitelistSettingsOnchain.maxMintedPresalePerAddress ).to.equal(0);

    // setting the max nft minted for presale = 10
    presaleSettingsData = buildPresaleSettings1155(
      saleStartTime + 3600, // publicsaleStartTime
      10,
      price,
      constants.ZERO_BYTES32,
    );
    await missAny2.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAny2.address;

    whitelistSettingsOnchain = await missAny2.dataPresaleSettings(id1);
    expect( whitelistSettingsOnchain.maxMintedPresalePerAddress ).to.equal(10);

    const merkleTree = await whitelistAddresses(missAny2, id1, [bob.address, sara.address]);
    const bobProof = await getWhitelistProof(merkleTree, bob.address);
    const saraProof = await getWhitelistProof(merkleTree, sara.address);

    const salt2 = 123456789
    const sign = (await getSignature(bob.address, signerPrivKey));
    const sign2 = await getSignature(sara.address, signerPrivKey, salt2)

    await missAny2.connect(bob).buyNFTsPresale(10, id1, bobProof, salt, sign.signature);
    expect(await missAny2.balanceOf(bob.address, id1)).to.be.equal(10);

    // Should revert if mint the presale exceed the limit
    await expectRevert(missAny2.connect(sara).buyNFTsPresale(1, id1, saraProof, salt2, sign2.signature), "Exceeded Max NFTs");
  });

  it("Test update whitelist", async function() {
    let merkleTree = await whitelistAddresses(missAny, id1, [bob.address])
    let proof = merkleTree.getHexProof(keccak256(bob.address));
    expect(await missAny.checkWhitelisted(id1, bob.address, proof)).to.equal(true);
    expect(await missAny.checkWhitelisted(id1, sara.address, proof)).to.equal(false);

    merkleTree = await whitelistAddresses(missAny, id1, [sara.address])
    proof = merkleTree.getHexProof(keccak256(bob.address));
    expect(await missAny.checkWhitelisted(id1, bob.address, proof)).to.equal(false);
    expect(await missAny.checkWhitelisted(id1, sara.address, proof)).to.equal(true);

    merkleTree = await whitelistAddresses(missAny, id1, [])
    proof = merkleTree.getHexProof(keccak256(bob.address));
    expect(await missAny.checkWhitelisted(id1, bob.address, proof)).to.equal(false);
    expect(await missAny.checkWhitelisted(id1, sara.address, proof)).to.equal(false);
  })

  it("Minting public or presale from contract should fail", async function() {
    MockContractBuyer = await ethers.getContractFactory("MockContractBuyer1155");
    mockContractBuyer = await MockContractBuyer.deploy(missAny.address);
    await mockContractBuyer.deployed();

    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(mockContractBuyer.mockBuyNFTSPresaleSignature(1, id1, salt, sign.signature), "Caller must be EOA");
    await expectRevert(mockContractBuyer.mockBuyNFTSPublicSignature(1, id1, salt, sign.signature), "Caller must be EOA");
  })

  it("Whitelisted minting must use the presale price", async function () {
    const pricePresale = ethers.utils.parseUnits("50", 18);
    const presalePayment = ethers.utils.parseUnits("250", 18)
    let params = buildParamsStandard1155(
      tokenName,
      tokenSymbol,
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAny2.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price, // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime + 3600, // publicsaleStartTime
      5,
      pricePresale,
      constants.ZERO_BYTES32,
    )

    await missAny2.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      presalePayment
    );
    const initTokenBalance = await token.balanceOf(bob.address);

    await whitelistAddresses(missAny2, id1, [bob.address]);

    const salt2 = 123456789
    const salt3 = 111;
    const sign = (await getSignature(bob.address, signerPrivKey));
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2)
    const sign3 = (await getSignature(bob.address, signerPrivKey, salt3));
    
    await missAny2.connect(bob).buyNFTsPresale(5, id1, [], salt, sign.signature);
    expect(await missAny2.balanceOf(bob.address, id1)).to.be.equal(5);
    await expectRevert(missAny2.buyNFTsPresale(10, id1, [], salt2, sign2.signature), "Unauthorized to join the presale");

    // Should revert if mint the presale exceed the limit
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, id1, [], salt3, sign3.signature), "Exceed the limit");

    const latestTokenBalance = await token.balanceOf(bob.address);
    expect(latestTokenBalance).to.equal(initTokenBalance.sub(ethers.BigNumber.from(presalePayment)).toString());
  });

  it("Whitelisted minting must use the presale price (using eth)", async function () {
    const pricePresale = ethers.utils.parseUnits("1", 18);
    const presalePayment = ethers.utils.parseUnits("5", 18)
    let params = buildParamsStandard1155(
      tokenName,
      tokenSymbol,
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime + 3600, // publicsaleStartTime
      5,
      pricePresale,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAnyWithETH.address;

    const initialETHBalance = await provider.getBalance(missAnyWithETH.address);
    expect(initialETHBalance).to.equal(0);

    await whitelistAddresses(missAnyWithETH, id1, [bob.address]);

    const salt2 = 123456789
    const salt3 = 111;
    const sign = (await getSignature(bob.address, signerPrivKey));
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2)
    const sign3 = (await getSignature(bob.address, signerPrivKey, salt3));

    await missAnyWithETH.connect(bob).buyNFTsPresale(5, id1, [], salt, sign.signature, {value: presalePayment});
    expect(await missAnyWithETH.balanceOf(bob.address, id1)).to.be.equal(5);
    await expectRevert(missAnyWithETH.buyNFTsPresale(10, id1, [], salt2, sign2.signature, {value: presalePayment}), "Unauthorized to join the presale");

    // Should revert if mint the presale exceed the limit
    await expectRevert(missAnyWithETH.connect(bob).buyNFTsPresale(1, id1, [], salt3, sign3.signature, {value: presalePayment}), "Exceed the limit");

    const latestETHBalance = await provider.getBalance(missAnyWithETH.address);
    expect(latestETHBalance).to.equal(ethers.BigNumber.from(presalePayment));
  });

  it("Mint NFTs presale should failed if sale has been finished", async function () {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)
    
    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleStartTime,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAnyWithETH.address;

    await whitelistAddresses(missAnyWithETH, id1, [bob.address]);

    const sign = (await getSignature(bob.address, signerPrivKey));

    await expectRevert(missAnyWithETH.connect(bob).buyNFTsPresale(5, id1, [], salt, sign.signature), "Sale has been finished");
  });

  it("Mint NFTs presale should failed if invalid eth sent", async function () {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAnyWithETH.address;

    await whitelistAddresses(missAnyWithETH, id1, [bob.address]);

    const sign = (await getSignature(bob.address, signerPrivKey));

    await expectRevert(missAnyWithETH.connect(bob).buyNFTsPresale(5, id1, [], salt, sign.signature), "Invalid eth for purchasing");
  });

  it("Purchasing NFT presale with eth (without sale end time)", async function () {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "ether"), // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      0,
      constants.ZERO_ADDRESS, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      wei("1", "ether"),
      constants.ZERO_BYTES32,
    )

    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAnyWithETH.address;

    await whitelistAddresses(missAnyWithETH, id1, [bob.address]);

    const sign = (await getSignature(bob.address, signerPrivKey));

    await missAnyWithETH.connect(bob).buyNFTsPresale(5, id1, [], salt, sign.signature, {value: wei("5", "ether")});
  });

  it("Whitelisted minting failed if payment required token but eth being sent", async function () {
    const pricePresale = ethers.utils.parseUnits("50", 18);
    const presalePayment = ethers.utils.parseUnits("250", 18)
    let params = buildParamsStandard1155(
      tokenName,
      tokenSymbol,
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAny2.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime+3600, // publicsaleStartTime
      5,
      pricePresale,
      constants.ZERO_BYTES32,
    )

    await missAny2.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      presalePayment
    );

    await whitelistAddresses(missAny2, id1, [bob.address]);

    const sign = (await getSignature(bob.address, signerPrivKey));

    await expectRevert(missAny2.connect(bob).buyNFTsPresale(5, id1, [], salt, sign.signature, {value: "1"}), "ETH_NOT_ALLOWED");
  });

  it("Can't mint NFTs using the used signature", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    await expectRevert(missAny.buyNFTsPublic(10, id1, salt, sign.signature), "Signature has been used");
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(10);
  });

  it("Can mint NFTs using the wrong signature", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price,
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAny.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    const sign = (await getSignature(owner.address, signerPrivKey));

    await expectRevert(missAny.buyNFTsPublic(10, id1, 123, sign.signature), "Invalid signature");
    expect(await missAny.balanceOf(owner.address, id1)).to.be.equal(0);
  });

  it("Purchasing NFT should failed if authorized signer address is not set", async function() {
    let params = buildParamsStandard1155(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      owner.address
    );

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      wei("1", "wei"),
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.updateTokenSettings(tokenSettingsData, presaleSettingsData);

    globalContractAddress = missAnyWithETH.address;

    const sign = await getSignature(owner.address, signerPrivKey);

    await expectRevert(missAnyWithETH.buyNFTsPublic(10, id1, salt, sign.signature, {value: wei("10", "wei")}), "Invalid signer addr");
  })

  it("Update the authorized signer address", async function () {
    await expectRevert(missAny.changeAuthorizedSignerAddress(constants.ZERO_ADDRESS), "ERR_ZERO_ADDRESS");
    await expectRevert(missAny.connect(bob).changeAuthorizedSignerAddress(bob.address), "Ownable: caller is not the owner");
    await missAny.changeAuthorizedSignerAddress(bob.address);
    expect(await missAny.authorizedSignerAddress()).to.equal(bob.address);
  });

  it("Whitelisted address Can mint NFTs after public start sale started", async function () {
    let params = buildParamsStandard1155(
      tokenName,
      tokenSymbol,
      tokenURI,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAny2.changeAuthorizedSignerAddress(signerAddress)

    let tokenSettingsData = buildTokenSettings1155(
      id1,
      10,
      price, // 1 ether, // 1 ether
      maxSupplyPerToken,
      saleStartTime,
      saleEndTime,
      token.address, // 1 ether,
      true
    )

    let presaleSettingsData = buildPresaleSettings1155(
      saleStartTime + 7200, // publicsaleStartTime
      5,
      price,
      constants.ZERO_BYTES32,
    )

    await missAny2.updateTokenSettings(tokenSettingsData, presaleSettingsData)

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    await whitelistAddresses(missAny2, id1, [bob.address]);

    const sign = (await getSignature(bob.address, signerPrivKey));
    await expectRevert(missAny2.connect(bob).buyNFTsPublic(10, id1, salt, sign.signature), "Sale has not been started");

    await ethers.provider.send("evm_mine", [saleStartTime+8000]);

    await missAny2.connect(bob).buyNFTsPublic(10, id1, salt, sign.signature);
    expect(await missAny2.balanceOf(bob.address, id1)).to.be.equal(10);
  });

});