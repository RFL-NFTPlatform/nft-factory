const { expect } = require("chai");
const { expectRevert, constants } = require("@openzeppelin/test-helpers");
const { waffle} = require("hardhat");
const { shouldSupportInterfaces } = require('../SupportsInterface.behavior');
const { buildParamsStandard } = require("../helpers/lib");
const NFTContract = artifacts.require("RFOXNFTStandardBotPrevention");

const wei = web3.utils.toWei;
const provider = waffle.provider;
const salt = 1234567;
let globalContractAddress;

const getSignature = async function (senderAddress, privKey, newSalt = null) {
  let _salt = newSalt ? newSalt : salt
  const hashMsg = web3.utils.soliditySha3(senderAddress, globalContractAddress, _salt);
  const signature = await web3.eth.accounts.sign(hashMsg, privKey);
  return signature;
}

describe("Miss PH NFTStandardSignature", function () {
  console.log("Starting NFTStandardSignature...");
  let RFOXFactory, nftContract, missAny, token, owner, bob, jane, sara, saleStartTime, saleEndTime;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const id1 = 123;
  const id2 = 124;
  const maxNfts = 20;
  let signerAccount, signerPrivKey, signerAddress;

  const tokenURI = "ipfs://";

  const price = ethers.utils.parseUnits("100", 18);
  const tokenName = "MissUniversePh";
  const tokenSymbol = "MISSUPH";

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
      "RFOXFactoryStandardBotPrevention"
    );
    RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    saleStartTime = Math.round(Date.now() / 1000); // current time
    saleEndTime = (Math.round(Date.now() / 1000) + 172800); // next 2 day

    let params = buildParamsStandard(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    nftContract = await ethers.getContractFactory("RFOXNFTStandardBotPrevention");
    missAny = await nftContract.attach(await RFOXFactory.allNFTs(0));
    globalContractAddress = missAny.address;
    await missAny.changeAuthorizedSignerAddress(signerAddress)
  });

  it("correctly NFT name", async function () {
    expect(await missAny.name()).to.be.equal(tokenName);
    expect(await missAny.symbol()).to.be.equal(tokenSymbol);
  });

  it("correctly mints a NFT", async function () {
    expect(await missAny.connect(owner).safeMint(bob.address)).to.emit(
      missAny,
      "Transfer"
    );
    expect(await missAny.balanceOf(bob.address)).to.equal(1);
  });

  it("returns correct balanceOf", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    expect(await missAny.balanceOf(bob.address)).to.equal(1);
    await missAny.connect(owner).safeMint(bob.address);
    expect(await missAny.balanceOf(bob.address)).to.equal(2);
  });

  it("throws when initialize the NFTs from unauthorized factory", async function() {
    let params = buildParamsStandard(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      owner.address
    );

    await expectRevert(missAny.initialize(params), "Forbidden")
  })

  it("throws when initialize the NFTs with invalid period", async function() {
    let params = buildParamsStandard(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      0,
      0,
      owner.address
    );

    await expectRevert(RFOXFactory.createNFT(params), "Invalid start time");
  })

  it("throws when initialize the NFTs with 0 max tokens per tx", async function() {
    let params = buildParamsStandard(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      0,
      1,
      0,
      owner.address
    );

    await expectRevert(RFOXFactory.createNFT(params), "Max tokens per tx cannot be 0");
  })

  it("initialize with empty sale end time", async function() {
    let params = buildParamsStandard(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      1,
      0,
      owner.address
    );

    await RFOXFactory.createNFT(params);
  })

  it("initialize with active sale end time", async function() {
    let params = buildParamsStandard(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      1,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);
  })

  it("throws when trying to get count of NFTs owned by 0x0 address", async function () {
    await expect(missAny.balanceOf(zeroAddress)).to.be.reverted;
  });

  it("throws when trying to mint NFT to 0x0 address", async function () {
    await expect(missAny.connect(owner).safeMint(zeroAddress)).to.be
      .reverted;
  });

  it("finds the correct owner of missAny id", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    expect(await missAny.ownerOf(0)).to.equal(bob.address);
  });

  it("throws when trying to find owner od non-existing NFT id", async function () {
    await expect(missAny.ownerOf(0)).to.be.reverted;
  });

  it("correctly approves account", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    expect(await missAny.connect(bob).approve(sara.address, 0)).to.emit(
      missAny,
      "Approval"
    );
    expect(await missAny.getApproved(0)).to.equal(sara.address);
  });

  it("correctly cancels approval", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    await missAny.connect(bob).approve(sara.address, 0);
    await missAny.connect(bob).approve(zeroAddress, 0);
    expect(await missAny.getApproved(0)).to.equal(zeroAddress);
  });

  it("throws when trying to get approval of non-existing NFT id", async function () {
    await expect(missAny.getApproved(id1)).to.be.reverted;
  });

  it("throws when trying to approve NFT ID from a third party", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    await expect(missAny.connect(sara).approve(sara.address, 0)).to.be
      .reverted;
  });

  it("correctly sets an operator", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    expect(
      await missAny.connect(bob).setApprovalForAll(sara.address, true)
    ).to.emit(missAny, "ApprovalForAll");
    expect(await missAny.isApprovedForAll(bob.address, sara.address)).to.equal(
      true
    );
  });

  it("correctly sets then cancels an operator", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    await missAny.connect(bob).setApprovalForAll(sara.address, true);
    await missAny.connect(bob).setApprovalForAll(sara.address, false);
    expect(await missAny.isApprovedForAll(bob.address, sara.address)).to.equal(
      false
    );
  });

  it("correctly transfers NFT from owner", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    expect(
      await missAny.connect(bob).transferFrom(bob.address, sara.address, 0)
    ).to.emit(missAny, "Transfer");
    expect(await missAny.balanceOf(bob.address)).to.equal(0);
    expect(await missAny.balanceOf(sara.address)).to.equal(1);
    expect(await missAny.ownerOf(0)).to.equal(sara.address);
  });

  it("correctly transfers NFT from approved address", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    await missAny.connect(bob).approve(sara.address, 0);
    await missAny.connect(sara).transferFrom(bob.address, jane.address, 0);
    expect(await missAny.balanceOf(bob.address)).to.equal(0);
    expect(await missAny.balanceOf(jane.address)).to.equal(1);
    expect(await missAny.ownerOf(0)).to.equal(jane.address);
  });

  it("correctly transfers NFT as operator", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    await missAny.connect(bob).setApprovalForAll(sara.address, true);
    await missAny.connect(sara).transferFrom(bob.address, jane.address, 0);
    expect(await missAny.balanceOf(bob.address)).to.equal(0);
    expect(await missAny.balanceOf(jane.address)).to.equal(1);
    expect(await missAny.ownerOf(0)).to.equal(jane.address);
  });

  it("throws when trying to transfer NFT as an address that is not owner, approved or operator", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    await expect(
      missAny.connect(sara).transferFrom(bob.address, jane.address, 0)
    ).to.be.reverted;
  });

  it("throws when trying to transfer NFT to a zero address", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    await expect(
      missAny.connect(bob).transferFrom(bob.address, zeroAddress, 0)
    ).to.be.reverted;
  });

  it("throws when trying to transfer an invalid NFT", async function () {
    await expect(
      missAny.connect(bob).transferFrom(bob.address, sara.address, id1)
    ).to.be.reverted;
  });

  it("throws when trying to transfer an invalid NFT", async function () {
    await expect(
      missAny.connect(bob).transferFrom(bob.address, sara.address, id1)
    ).to.be.reverted;
  });

  it("correctly safe transfers NFT from owner", async function () {
    await missAny.connect(owner).safeMint(bob.address);
    expect(
      await missAny
        .connect(bob)
        ["safeTransferFrom(address,address,uint256)"](
          bob.address,
          sara.address,
          0
        )
    ).to.emit(missAny, "Transfer");
    expect(await missAny.balanceOf(bob.address)).to.equal(0);
    expect(await missAny.balanceOf(sara.address)).to.equal(1);
    expect(await missAny.ownerOf(0)).to.equal(sara.address);
  });

  it("Only owner can create NFT contract", async function () {
    const RFOXNFTFactory = await ethers.getContractFactory(
      "RFOXFactoryStandardBotPrevention"
    );
    const RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    const localSaleStartTime = Math.round(Date.now() / 1000); // current time
    const localSaleEndTime = (Math.round(Date.now() / 1000) + 3600); // next 1 hour
    
    let params = buildParamsStandard(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      localSaleStartTime,
      localSaleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    await expect(
      RFOXFactory
        .connect(bob.address)
        .createNFT(params)
    ).to.be.reverted;
  });

  it("Only owner can create multiple NFTs contract", async function () {
    const RFOXNFTFactory = await ethers.getContractFactory(
      "RFOXFactoryStandardBotPrevention"
    );
    const RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    const localSaleStartTime = Math.round(Date.now() / 1000); // current time
    const localSaleEndTime = (Math.round(Date.now() / 1000) + 3600); // next 1 hour

    for (let i = 0; i < 10; i++) {
      let params = buildParamsStandard(
        tokenName + i,
        tokenSymbol,
        tokenURI,
        token.address,
        price,
        maxNfts,
        10,
        localSaleStartTime,
        localSaleEndTime,
        owner.address
      );

      await RFOXFactory.createNFT(params);
    }
  });

  it("Update the authorized signer address", async function () {
    await expectRevert(missAny.changeAuthorizedSignerAddress(constants.ZERO_ADDRESS), "ERR_ZERO_ADDRESS");
    await missAny.changeAuthorizedSignerAddress(bob.address);
    expect(await missAny.authorizedSignerAddress()).to.equal(bob.address);
  });

  it("Can mint NFTs", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    await missAny.buyNFTsPublic(10, salt, sign.signature);
    expect(await missAny.balanceOf(owner.address)).to.be.equal(10);
  });

  it("Can mint NFTs using the wrong signature", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    await expectRevert(missAny.buyNFTsPublic(10, 123, sign.signature), "Invalid signature");
    expect(await missAny.balanceOf(owner.address)).to.be.equal(0);
  });

  it("Can't mint NFTs using the used signature", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    await missAny.buyNFTsPublic(10, salt, sign.signature);
    await expectRevert(missAny.buyNFTsPublic(10, salt, sign.signature), "Signature has been used");
    expect(await missAny.balanceOf(owner.address)).to.be.equal(10);
  });

  it("Mint NFTs should failed if exceed the total limit per one tx", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    await expectRevert(missAny.buyNFTsPublic(100, salt, sign.signature), "Max purchase per one transaction exceeded");
  });

  it("Mint NFTs should failed if has not been started", async function () {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleEndTime,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    await token.approve(
      missAnyWithETH.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    globalContractAddress = missAnyWithETH.address;
    await expectRevert(missAnyWithETH.buyNFTsPublic(10, salt, sign.signature), "Sale has not been started");
  });

  it("Mint NFTs should failed if sale has been finished", async function () {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleStartTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;

    await token.approve(
      missAnyWithETH.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));
    globalContractAddress = missAnyWithETH.address;
    await expectRevert(missAnyWithETH.buyNFTsPublic(10, salt, sign.signature), "Sale has been finished");
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

    await missAny.buyNFTsPublic(10, salt, sign.signature);
    await missAny.buyNFTsPublic(10, salt2, sign2.signature);
    expect(await missAny.balanceOf(owner.address)).to.be.equal(20);
    await expect(missAny.buyNFTsPublic(1, salt3, sign3.signature)).to.be.revertedWith(
      "Exceeded Max NFTs"
    );
  });

  it("Cannot mint exceed max NFTs case 2", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const salt2 = 123456789;
    const salt3 = 111;
    const sign = (await getSignature(owner.address, signerPrivKey));
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2);
    const sign3 = await getSignature(owner.address, signerPrivKey, salt3);


    await missAny.buyNFTsPublic(10, salt, sign.signature);
    await missAny.buyNFTsPublic(5, salt2, sign2.signature);
    await expect(missAny.buyNFTsPublic(10, salt3, sign3.signature)).to.be.revertedWith(
      "Exceeded Max NFTs"
    );
  });

  it("Correct totalSupply", async function () {
    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = await getSignature(owner.address, signerPrivKey);

    await missAny.buyNFTsPublic(10, salt, sign.signature);
    expect(await missAny.balanceOf(owner.address)).to.be.equal(10);
    expect(await missAny.totalSupply()).to.be.equal(10);
  });

  it("Safe mint should revert if called by unauthorized caller", async function () {
    await expectRevert(missAny.connect(bob).safeMint(sara.address), "Ownable: caller is not the owner");
  })

  it("Safe mint should revert if called by unauthorized caller", async function () {
    for(let i = 0; i < maxNfts; i++) {
      await missAny.safeMint(sara.address);
    }
    await expectRevert(missAny.safeMint(sara.address), "Exceeded Max NFTs");
  })

  it("Safe mint", async function () {
    await missAny.safeMint(sara.address);
    expect(await missAny.balanceOf(sara.address)).to.be.equal(1);
    expect(await missAny.totalSupply()).to.be.equal(1);
  })

  it("Update base URI", async function () {
    await expectRevert(missAny.connect(bob).setBaseURI("updatedLink"), "Ownable: caller is not the owner");
    await missAny.setBaseURI("updatedLink");
    await missAny.safeMint(sara.address);
    expect(await missAny.tokenURI(0)).to.equal("updatedLink0");
    expect(await missAny.baseURI()).to.equal("updatedLink");
  })

  it("Pause the NFT contract", async function() {
    await expectRevert(missAny.connect(bob).pause(), "Ownable: caller is not the owner")
    await missAny.pause();
    expect(await missAny.paused()).to.equal(true)

    // Unpause
  await expectRevert(missAny.connect(bob).unpause(), "Ownable: caller is not the owner")
    await missAny.unpause();
    expect(await missAny.paused()).to.equal(false)
  })

  it("Set new token price", async function() {
    const newPrice = wei("100", "wei");
    await missAny.setTokenPrice(newPrice);
    expect( (await missAny.TOKEN_PRICE()).toString() ).to.equal(newPrice);
  })

  it("Purchasing with ETH should failed if ETH is invalid", async function() {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;

    const salt2 = 123456789;
    const sign = await getSignature(owner.address, signerPrivKey);
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2);

    await expectRevert(missAnyWithETH.buyNFTsPublic(10, salt, sign.signature, {value: wei("11", "wei")}), "Invalid eth for purchasing");
    await expectRevert(missAnyWithETH.buyNFTsPublic(10, salt2, sign2.signature, {value: wei("9", "wei")}), "Invalid eth for purchasing");
  })

  it("Purchasing NFT with eth", async function() {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);
    
    globalContractAddress = missAnyWithETH.address;

    const sign = await getSignature(owner.address, signerPrivKey);

    await missAnyWithETH.buyNFTsPublic(10, salt, sign.signature, {value: wei("10", "wei")});
    const latestETHBalance = await provider.getBalance(missAnyWithETH.address);

    expect(latestETHBalance).to.equal(wei("10", "wei"));
  })

  it("Purchasing NFT with eth (without sale end time)", async function() {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      0,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;

    const sign = await getSignature(owner.address, signerPrivKey);

    await missAnyWithETH.buyNFTsPublic(10, salt, sign.signature, {value: wei("10", "wei")});
    const latestETHBalance = await provider.getBalance(missAnyWithETH.address);

    expect(latestETHBalance).to.equal(wei("10", "wei"));
  })

  it("Purchasing NFT should failed if authorized signer address is not set", async function() {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      0,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAnyWithETH.address;

    const sign = await getSignature(owner.address, signerPrivKey);

    await expectRevert(missAnyWithETH.buyNFTsPublic(10, salt, sign.signature, {value: wei("10", "wei")}), "Invalid signer addr");
  })

  it("Purchasing NFT with eth should be failed if sale token is set", async function() {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      token.address,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;

    const sign = await getSignature(owner.address, signerPrivKey);

    await expectRevert(missAnyWithETH.buyNFTsPublic(10, salt, sign.signature, {value: wei("10", "wei")}), "ETH_NOT_ALLOWED");
  })

  it("Withdraw eth", async function() {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;

    const initialETHBalance = await provider.getBalance(missAnyWithETH.address);
    expect(initialETHBalance).to.equal(0);
    const initialOwnerETHBalance = await provider.getBalance(owner.address);

    const sign = await getSignature(sara.address, signerPrivKey);

    await missAnyWithETH.connect(sara).buyNFTsPublic(10, salt, sign.signature, {value: wei("10", "ether")});
    let latestETHBalance = await provider.getBalance(missAnyWithETH.address);

    expect(latestETHBalance).to.equal(wei("10", "ether"));
    
    const tx = await missAnyWithETH.connect(owner).withdraw();
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

    const sign = await getSignature(owner.address, signerPrivKey);

    expect(await token.balanceOf(missAny.address)).to.equal(0);
    await missAny.buyNFTsPublic(10, salt, sign.signature);
    expect(await missAny.balanceOf(owner.address)).to.be.equal(10);
    expect( (await token.balanceOf(missAny.address)).toString()).to.equal(totalTokenApproved)

    await missAny.transferOwnership(sara.address);
    expect(await missAny.owner()).to.equal(sara.address);

    await missAny.connect(sara).withdraw();
    expect( (await token.balanceOf(missAny.address)).toString()).to.equal("0")
    expect( (await token.balanceOf(sara.address)).toString()).to.equal(totalTokenApproved)
  });

  it("Withdraw should failed if called from unauthorized owner", async function() {
    const MockReceiver = await ethers.getContractFactory("MockERC20");
    const receiverContract = await MockReceiver.deploy();
    await token.deployed();
    await missAny.transferOwnership(receiverContract.address);
    expect(await missAny.owner()).to.equal(receiverContract.address);
    await expectRevert(missAny.withdraw(), "Ownable: caller is not the owner");
  })

  it("Withdraw eth failed", async function() {
    let params = buildParamsStandard(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;

    const sign = await getSignature(sara.address, signerPrivKey);

    await missAnyWithETH.connect(sara).buyNFTsPublic(10, salt, sign.signature, {value: wei("10", "ether")});

    const MockReceiver = await ethers.getContractFactory("MockReceiver");
    const receiverContract = await MockReceiver.deploy(missAnyWithETH.address);
    await receiverContract.deployed();

    expect(await receiverContract.NFT()).to.equal(missAnyWithETH.address);
    await missAnyWithETH.transferOwnership(receiverContract.address);
    expect(await missAnyWithETH.owner()).to.equal(receiverContract.address);
    await expectRevert(receiverContract.withdraw(), "Failed to withdraw Ether");
  })

  it("Supports interface", async function(){
    const nftContract = await NFTContract.at(missAny.address);
    shouldSupportInterfaces(nftContract, [
      'ERC721Enumerable',
    ]);
  })

  it("Change the maxTokensPerTransaction should fail if called by non-owner", async() => {
    await expectRevert(missAny.connect(bob).setMaxTokensPerTransaction(50), "Ownable: caller is not the owner");
  })

  it("Change the maxTokensPerTransaction should fail if set to zero", async() => {
    await expectRevert(missAny.setMaxTokensPerTransaction(0), "INVALID_ZERO_VALUE");
  })

  it("Change the maxTokensPerTransaction", async() => {
    const newMaxTokens = 50;
    await missAny.setMaxTokensPerTransaction(newMaxTokens);
    expect(await missAny.maxTokensPerTransaction()).to.equal(newMaxTokens);
  })

  it("Minting public from contract should fail", async function() {
    MockContractBuyer = await ethers.getContractFactory("MockContractBuyer");
    mockContractBuyer = await MockContractBuyer.deploy(missAny.address);
    await mockContractBuyer.deployed();

    const sign = await getSignature(owner.address, signerPrivKey);
    await expectRevert(mockContractBuyer.mockBuyNFTSPublicSignature(1, salt, sign.signature), "Caller must be EOA");
  })
});