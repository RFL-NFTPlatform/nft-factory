const { expect } = require("chai");
const { expectRevert, constants } = require("@openzeppelin/test-helpers");
const { waffle} = require("hardhat");
const { shouldSupportInterfaces } = require('../SupportsInterface.behavior');
const { buildParamsStandard1155, buildTokenSettings1155 } = require("../helpers/lib");
const NFTContract = artifacts.require("RFOXNFTStandardBotPrevention1155");

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

describe("Miss PH NFTStandardSignature1155", function () {
  console.log("Starting NFTStandardSignature1155...");
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
      "RFOXFactoryStandardBotPrevention1155"
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

    await RFOXFactory.createNFT(params);

    nftContract = await ethers.getContractFactory("RFOXNFTStandardBotPrevention1155");
    missAny = await nftContract.attach(await RFOXFactory.allNFTs(0));

    globalContractAddress = missAny.address;

    await missAny.updateTokenSettings(tokenSettingsData);
    await missAny.changeAuthorizedSignerAddress(signerAddress)
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
    await expectRevert(missAny.updateTokenSettings(tokenSettingsData), "Invalid start time");
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

    await expectRevert(missAny.connect(bob).setBaseURI("updatedLink"), "Ownable: caller is not the owner");
    await missAny.setBaseURI("updatedLink");

    const sign = (await getSignature(owner.address, signerPrivKey));

    await missAny.buyNFTsPublic(10, id1, salt, sign.signature);
    expect(await missAny.uri(0)).to.equal("updatedLink0");
    expect(await missAny.baseURI()).to.equal("updatedLink");
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

    await expectRevert(missAny.updateTokenSettings(tokenSettingsData), "Max supply can't be less than current total supply");
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

    globalContractAddress = missAnyWithETH.address;

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);

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

    globalContractAddress = missAnyWithETH.address;

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

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

    await missAny.updateTokenSettings(newTokenSettingsData);

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);

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

    globalContractAddress = missAnyWithETH.address;

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);

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

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

    globalContractAddress = missAnyWithETH.address;

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress)

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

    await missAnyWithETH.updateTokenSettings(tokenSettingsData);

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

    await expectRevert(missAny.connect(bob).updateTokenSettings(tokenSettingsData), "Ownable: caller is not the owner");
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

    await expectRevert(missAny.updateTokenSettings(tokenSettingsData), "Max tokens per tx cannot be 0");
  })

  it("Minting public from contract should fail", async function() {
    MockContractBuyer = await ethers.getContractFactory("MockContractBuyer1155");
    mockContractBuyer = await MockContractBuyer.deploy(missAny.address);
    await mockContractBuyer.deployed();
    const sign = (await getSignature(owner.address, signerPrivKey));
    await expectRevert(mockContractBuyer.mockBuyNFTSPublicSignature(1, id1, salt, sign.signature), "Caller must be EOA");
  })

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

    await missAny.updateTokenSettings(tokenSettingsData);

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

    await missAny.updateTokenSettings(tokenSettingsData);

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

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.updateTokenSettings(tokenSettingsData);

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
});