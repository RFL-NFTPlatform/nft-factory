const { expect } = require("chai");
const { expectRevert, constants } = require("@openzeppelin/test-helpers");
const { waffle} = require("hardhat");
const { shouldSupportInterfaces } = require('../SupportsInterface.behavior');
const { MerkleTree } = require("merkletreejs");
const { buildParams } = require("../helpers/lib");
const keccak256 = require("keccak256");
const NFTContract = artifacts.require("RFOXNFTWhitelistBotPrevention");

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

const whitelistAddresses = async function(nftContract, whitelistedAddresses) {
  const leafNodes = whitelistedAddresses.map(addr => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
  const rootHash = merkleTree.getRoot();
  const completeRootHash = '0x' + rootHash.toString('hex');

  if(whitelistedAddresses.length > 0) {
    const proof = merkleTree.getHexProof(keccak256(whitelistedAddresses[0]));
    expect(await nftContract.checkWhitelisted(whitelistedAddresses[0], proof)).to.equal(false);
  
    await nftContract.updateMerkleRoot(completeRootHash);
    expect(await nftContract.merkleRoot()).to.equal(completeRootHash);
  
    expect(await nftContract.checkWhitelisted(whitelistedAddresses[0], proof)).to.equal(true);
  } else {
    await nftContract.updateMerkleRoot(constants.ZERO_BYTES32);
  }

  return merkleTree;
}

const getWhitelistProof = async function (merkleTree, address) {
  return merkleTree.getHexProof(keccak256(address));
}

describe("Miss PH NFTWhitelistSignature", async function () {
  let RFOXFactory, nftContract, missAny, token, owner, bob, jane, sara, saleStartTime, saleEndTime;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const id1 = 123;
  const id2 = 124;
  let maxNfts = 20;

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
      "RFOXFactoryWhitelistBotPrevention"
    );
    RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    saleStartTime = Math.round(Date.now() / 1000); // current time
    saleEndTime = (Math.round(Date.now() / 1000) + 172800); // next 2 day

    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      maxNfts,
      5,
      price,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    nftContract = await ethers.getContractFactory("RFOXNFTWhitelistBotPrevention");
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
    let params = buildParams(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      maxNfts,
      5,
      price,
      owner.address
    );
    
    await expectRevert(missAny.initialize(params), "Forbidden")
  })

  it("throws when initialize the NFTs with invalid period", async function() {
    let params = buildParams(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      0,
      0,
      0,
      maxNfts,
      5,
      price,
      owner.address
    );

    await expectRevert(RFOXFactory.createNFT(params), "Invalid start time");
  })

  it("throws when initialize the NFTs with 0 max tokens per tx", async function() {
    let params = buildParams(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      0,
      1,
      0,
      1,
      maxNfts,
      5,
      price,
      owner.address
    );

    await expectRevert(RFOXFactory.createNFT(params), "Max tokens per tx cannot be 0");
  })

  it("initialize with empty sale end time", async function() {
    let params = buildParams(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      1,
      0,
      1,
      maxNfts,
      5,
      price,
      owner.address
    );

    await RFOXFactory.createNFT(params);
  })

  it("initialize with invalid public sale time", async function() {
    let params = buildParams(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      1,
      0,
      0,
      maxNfts,
      5,
      price,
      owner.address
    );

    await expectRevert(RFOXFactory.createNFT(params), "Invalid public sale time");
  })

  it("initialize with active sale end time", async function() {
    let params = buildParams(
      "TEST",
      "TEST",
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      1,
      saleEndTime,
      1,
      maxNfts,
      5,
      price,
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
      "RFOXFactoryWhitelist"
    );
    const RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    const localSaleStartTime = Math.round(Date.now() / 1000); // current time
    const localSaleEndTime = (Math.round(Date.now() / 1000) + 3600); // next 1 hour

    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      localSaleStartTime,
      localSaleEndTime,
      localSaleStartTime,
      maxNfts,
      5,
      price,
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
      "RFOXFactoryWhitelist"
    );
    const RFOXFactory = await RFOXNFTFactory.deploy();
    await RFOXFactory.deployed();

    const localSaleStartTime = Math.round(Date.now() / 1000); // current time
    const localSaleEndTime = (Math.round(Date.now() / 1000) + 3600); // next 1 hour

    for (let i = 0; i < 10; i++) {
      let params = buildParams(
        tokenName + i,
        tokenSymbol,
        tokenURI,
        token.address,
        price,
        maxNfts,
        10,
        localSaleStartTime,
        localSaleEndTime,
        localSaleStartTime,
        maxNfts,
        5,
        price,
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
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleEndTime,
      saleEndTime,
      saleEndTime,
      maxNfts,
      5,
      price,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;
    
    globalContractAddress = missAnyWithETH.address;

    await token.approve(
      missAnyWithETH.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = (await getSignature(owner.address, signerPrivKey));

    await expectRevert(missAnyWithETH.buyNFTsPublic(10, salt, sign.signature), "Sale has not been started");
  });

  it("Mint NFTs should failed if sale has been finished", async function () {
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleStartTime,
      saleStartTime,
      maxNfts,
      5,
      price,
      owner.address,
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
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      maxNfts,
      5,
      price,
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
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      maxNfts,
      5,
      price,
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
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      0,
      saleStartTime,
      maxNfts,
      5,
      price,
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

  it("Purchasing NFT with eth should be failed if sale token is set", async function() {
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      token.address,
      wei("1", "wei"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      maxNfts,
      5,
      price,
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
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      maxNfts,
      5,
      price,
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
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      maxNfts,
      5,
      price,
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

  it("Activate & Deactivate whitelist feature", async function() {
    expect(await missAny.isWhitelistActivated()).to.equal(true);
    await missAny.deactivateWhitelist();
    expect(await missAny.isWhitelistActivated()).to.equal(false);
    await missAny.activateWhitelist();
    expect(await missAny.isWhitelistActivated()).to.equal(true);
  })

  it("Deactivate whitelist feature should failed if whitelist feature is not yet active", async function() {
    expect(await missAny.isWhitelistActivated()).to.equal(true);
    await missAny.deactivateWhitelist();
    expect(await missAny.isWhitelistActivated()).to.equal(false);
    await expectRevert(missAny.deactivateWhitelist(), "Whitelist is not active");
    expect(await missAny.isWhitelistActivated()).to.equal(false);
  })

  it("Activate whitelist feature should failed if whitelist feature is active", async function() {
    expect(await missAny.isWhitelistActivated()).to.equal(true);
    await expectRevert(missAny.activateWhitelist(), "Whitelist is active");
    expect(await missAny.isWhitelistActivated()).to.equal(true);
  })

  it("Activate or Deactivate whitelist should failed if called by non-owner", async function() {
    expect(await missAny.isWhitelistActivated()).to.equal(true);
    await expectRevert(missAny.connect(bob).deactivateWhitelist(), "Ownable: caller is not the owner");
    await expectRevert(missAny.connect(bob).activateWhitelist(), "Ownable: caller is not the owner");
    expect(await missAny.isWhitelistActivated()).to.equal(true);
  })

  it("Unwhitelist Can't mint NFTs from the presale", async function () {
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+1800,
      maxNfts,
      5,
      price,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    await token.approve(
      missAny.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const sign = await getSignature(owner.address, signerPrivKey);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));

    await expectRevert(missAny2.buyNFTsPresale(10, [], salt, sign.signature), "Unauthorized to join the presale");
  });

  it("Whitelisted address Can mint NFTs before public start sale started and after presale started", async function () {
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+3600,
      maxNfts,
      0,
      price,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    await whitelistAddresses(missAny2, [bob.address]);
    await missAny2.changeAuthorizedSignerAddress(signerAddress);
    
    const salt2 = 123456789
    const salt3 = 111;
    const sign = await getSignature(bob.address, signerPrivKey);
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2);
    const sign3 = await getSignature(bob.address, signerPrivKey, salt3);

    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(0);
    await missAny2.updateMaxMintedPresalePerAddress(5);
    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(5);

    // Should revert presale tx if signature is wrong
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, [], 111, sign.signature), "Invalid signature");

    await missAny2.connect(bob).buyNFTsPresale(5, [], salt, sign.signature);

    // Cannot use the same signature for presale
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, [], salt, sign.signature), "Signature has been used");

    expect(await missAny2.balanceOf(bob.address)).to.be.equal(5);
    await expectRevert(missAny2.buyNFTsPresale(10, [], salt2, sign2.signature), "Unauthorized to join the presale");

    // Should revert if mint the presale exceed the limit
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, [], salt3, sign3.signature), "Exceed the limit");
  });

  it("Whitelisted address Can't mint NFTs if the quota for presale is full", async function () {
    maxNfts = 10;
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+3600,
      maxNfts,
      0,
      price,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    const merkleTree = await whitelistAddresses(missAny2, [bob.address, sara.address]);
    const bobProof = await getWhitelistProof(merkleTree, bob.address);
    const saraProof = await getWhitelistProof(merkleTree, sara.address);
    await missAny2.changeAuthorizedSignerAddress(signerAddress);

    const salt2 = 123456789
    const sign = await getSignature(bob.address, signerPrivKey);
    const sign2 = await getSignature(sara.address, signerPrivKey, salt2);

    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(0);
    // setting the max nft minted for presale = 5
    await missAny2.updateMaxMintedPresalePerAddress(10);
    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(10);

    await missAny2.connect(bob).buyNFTsPresale(10, bobProof, salt, sign.signature);
    expect(await missAny2.balanceOf(bob.address)).to.be.equal(10);

    await expectRevert(missAny2.connect(sara).buyNFTsPresale(3, saraProof, salt2, sign2.signature), "Exceeded Max NFTs'");
  });

  it("Set the max minted presale per address should failed if called by non-owner or set more than the max total supply", async function() {
    await expectRevert(missAny.connect(bob).updateMaxMintedPresalePerAddress(10), "Ownable: caller is not the owner");
    await expectRevert(missAny.updateMaxMintedPresalePerAddress((await missAny.MAX_NFT()).add(ethers.BigNumber.from("1")) ), "Invalid max mint per address");
  })

  it("Test update whitelist", async function() {
    let merkleTree = await whitelistAddresses(missAny, [bob.address])
    let proof = merkleTree.getHexProof(keccak256(bob.address));
    expect(await missAny.checkWhitelisted(bob.address, proof)).to.equal(true);
    expect(await missAny.checkWhitelisted(sara.address, proof)).to.equal(false);

    merkleTree = await whitelistAddresses(missAny, [sara.address])
    proof = merkleTree.getHexProof(keccak256(bob.address));
    expect(await missAny.checkWhitelisted(bob.address, proof)).to.equal(false);
    expect(await missAny.checkWhitelisted(sara.address, proof)).to.equal(true);

    merkleTree = await whitelistAddresses(missAny, [])
    proof = merkleTree.getHexProof(keccak256(bob.address));
    expect(await missAny.checkWhitelisted(bob.address, proof)).to.equal(false);
    expect(await missAny.checkWhitelisted(sara.address, proof)).to.equal(false);
  })

  it("Minting public or presale from contract should fail", async function() {
    MockContractBuyer = await ethers.getContractFactory("MockContractBuyer");
    mockContractBuyer = await MockContractBuyer.deploy(missAny.address);
    await mockContractBuyer.deployed();

    const sign = await getSignature(owner.address, signerPrivKey);
    await expectRevert(mockContractBuyer.mockBuyNFTSPresaleSignature(1, salt, sign.signature), "Caller must be EOA");
    await expectRevert(mockContractBuyer.mockBuyNFTSPublicSignature(1, salt, sign.signature), "Caller must be EOA");
  })

  it("Update Presale price", async function() {
    const newPrice = wei("100", "wei");
    await missAny.setTokenPricePresale(newPrice);
    expect( (await missAny.TOKEN_PRICE_PRESALE()).toString() ).to.equal(newPrice); 
  })

  it("Whitelisted minting must use the presale price", async function () {
    const pricePresale = ethers.utils.parseUnits("50", 18);
    const presalePayment = ethers.utils.parseUnits("250", 18)
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+3600,
      maxNfts,
      0,
      pricePresale,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      presalePayment
    );

    await whitelistAddresses(missAny2, [bob.address]);
    await missAny2.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAny2.address;
    
    const salt2 = 123456789
    const salt3 = 111;
    const sign = await getSignature(bob.address, signerPrivKey);
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2);
    const sign3 = await getSignature(bob.address, signerPrivKey, salt3);

    const initTokenBalance = await token.balanceOf(bob.address);

    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(0);
    await missAny2.updateMaxMintedPresalePerAddress(5);
    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(5);

    await missAny2.connect(bob).buyNFTsPresale(5, [], salt, sign.signature);
    expect(await missAny2.balanceOf(bob.address)).to.be.equal(5);
    await expectRevert(missAny2.buyNFTsPresale(10, [], salt2, sign2.signature), "Unauthorized to join the presale");

    // Should revert if mint the presale exceed the limit
    await expectRevert(missAny2.connect(bob).buyNFTsPresale(1, [], salt3, sign3.signature), "Exceed the limit");

    const latestTokenBalance = await token.balanceOf(bob.address);
    expect(latestTokenBalance).to.equal(initTokenBalance.sub(ethers.BigNumber.from(presalePayment)).toString());
  });

  it("Whitelisted minting must use the presale price (using eth)", async function () {
    const pricePresale = ethers.utils.parseUnits("1", 18);
    const presalePayment = ethers.utils.parseUnits("5", 18)
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      constants.ZERO_ADDRESS,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+3600,
      maxNfts,
      0,
      pricePresale,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAnyWithETH.address;

    const initialETHBalance = await provider.getBalance(missAnyWithETH.address);
    expect(initialETHBalance).to.equal(0);

    await whitelistAddresses(missAnyWithETH, [bob.address]);
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    const salt2 = 123456789
    const salt3 = 111;
    const sign = await getSignature(bob.address, signerPrivKey);
    const sign2 = await getSignature(owner.address, signerPrivKey, salt2);
    const sign3 = await getSignature(bob.address, signerPrivKey, salt3);

    expect(await missAnyWithETH.maxMintedPresalePerAddress()).to.equal(0);
    await missAnyWithETH.updateMaxMintedPresalePerAddress(5);
    expect(await missAnyWithETH.maxMintedPresalePerAddress()).to.equal(5);

    await missAnyWithETH.connect(bob).buyNFTsPresale(5, [], salt, sign.signature, {value: presalePayment});
    expect(await missAnyWithETH.balanceOf(bob.address)).to.be.equal(5);
    await expectRevert(missAnyWithETH.buyNFTsPresale(10, [], salt2, sign2.signature, {value: presalePayment}), "Unauthorized to join the presale");

    // Should revert if mint the presale exceed the limit
    await expectRevert(missAnyWithETH.connect(bob).buyNFTsPresale(1, [], salt3, sign3.signature, {value: presalePayment}), "Exceed the limit");

    const latestETHBalance = await provider.getBalance(missAnyWithETH.address);
    expect(latestETHBalance).to.equal(ethers.BigNumber.from(presalePayment));
  });

  it("Mint NFTs should failed if sale has been finished", async function () {
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleStartTime,
      saleStartTime,
      maxNfts,
      5,
      price,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    globalContractAddress = missAnyWithETH.address;

    await whitelistAddresses(missAnyWithETH, [bob.address]);

    const sign = await getSignature(bob.address, signerPrivKey);

    await expectRevert(missAnyWithETH.connect(bob).buyNFTsPresale(5, [], salt, sign.signature), "Sale has been finished");
  });

  it("Mint NFTs presale should failed if invalid eth sent", async function () {
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      saleStartTime+86400,
      saleStartTime,
      maxNfts,
      5,
      price,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAnyWithETH.address;

    await whitelistAddresses(missAnyWithETH, [bob.address]);
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    const sign = await getSignature(bob.address, signerPrivKey);

    await expectRevert(missAnyWithETH.connect(bob).buyNFTsPresale(5, [], salt, sign.signature), "Invalid eth for purchasing");
  });

  it("Purchasing NFT presale with eth (without sale end time)", async function () {
    let params = buildParams(
      "ETH_NFT",
      "ETHNFT",
      tokenURI,
      constants.ZERO_ADDRESS,
      wei("1", "ether"), // 1 ether
      maxNfts,
      10,
      saleStartTime,
      0,
      saleStartTime,
      maxNfts,
      5,
      wei("1", "ether"),
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAnyWithETH = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAnyWithETH.address;

    await whitelistAddresses(missAnyWithETH, [bob.address]);
    await missAnyWithETH.changeAuthorizedSignerAddress(signerAddress);

    const sign = await getSignature(bob.address, signerPrivKey);

    await missAnyWithETH.connect(bob).buyNFTsPresale(5, [], salt, sign.signature, {value: wei("5", "ether")});
  });

  it("Whitelisted minting failed if payment required token but eth being sent", async function () {
    const pricePresale = ethers.utils.parseUnits("50", 18);
    const presalePayment = ethers.utils.parseUnits("250", 18)
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+86400,
      maxNfts,
      0,
      pricePresale,
      owner.address,
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      presalePayment
    );

    await whitelistAddresses(missAny2, [bob.address]);
    await missAny2.changeAuthorizedSignerAddress(signerAddress);

    const sign = await getSignature(bob.address, signerPrivKey);

    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(0);
    await missAny2.updateMaxMintedPresalePerAddress(5);
    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(5);

    await expectRevert(missAny2.connect(bob).buyNFTsPresale(5, [], salt, sign.signature, {value: "1"}), "ETH_NOT_ALLOWED");
  });

  it("Whitelisted address Can mint NFTs after public start sale started", async function () {
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+15200,
      maxNfts,
      5,
      price,
      owner.address
    );

    await RFOXFactory.createNFT(params);

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));

    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    await whitelistAddresses(missAny2, [bob.address]);
    await missAny2.changeAuthorizedSignerAddress(signerAddress);

    const salt2 = 123456789;
    const sign = await getSignature(bob.address, signerPrivKey);
    const sign2 = await getSignature(bob.address, signerPrivKey, salt2);

    await expectRevert(missAny2.connect(bob).buyNFTsPublic(10, salt, sign.signature), "Sale has not been started");

    await ethers.provider.send("evm_mine", [saleStartTime+16000]);

    await missAny2.connect(bob).buyNFTsPublic(10, salt2, sign2.signature);
    expect(await missAny2.balanceOf(bob.address)).to.be.equal(10);
  });

  it("calling presale mint if whitelist flag is not activated", async function() {
    let params = buildParams(
      tokenName,
      tokenSymbol,
      tokenURI,
      token.address,
      price,
      maxNfts,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime+16500,
      maxNfts,
      0,
      price,
      owner.address
    );

    await RFOXFactory.createNFT(
      params
    );

    const missAny2 = await nftContract.attach(await RFOXFactory.allNFTs(1));
    globalContractAddress = missAny2.address;

    await token.transfer(bob.address, hre.ethers.utils.parseUnits("10000000"));
    await token.connect(bob).approve(
      missAny2.address,
      hre.ethers.utils.parseUnits("10000000")
    );

    await whitelistAddresses(missAny2, [bob.address]);
    await missAny2.changeAuthorizedSignerAddress(signerAddress);

    await missAny2.deactivateWhitelist();

    const salt2 = 123456789
    const sign = await getSignature(bob.address, signerPrivKey);
    const sign2 = await getSignature(bob.address, signerPrivKey, salt2);

    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(0);
    await missAny2.updateMaxMintedPresalePerAddress(5);
    expect(await missAny2.maxMintedPresalePerAddress()).to.equal(5);

    await expectRevert(missAny2.connect(bob).buyNFTsPresale(5, [], salt, sign.signature), "Sale has not been started");
    await ethers.provider.send("evm_mine", [saleStartTime+16600]);
    await missAny2.connect(bob).buyNFTsPresale(5, [], salt2, sign2.signature);
  })

});