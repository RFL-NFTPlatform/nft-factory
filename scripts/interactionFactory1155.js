const { constants } = require("@openzeppelin/test-helpers");
const { decodeLogs, buildParamsStandard1155, buildTokenSettings1155, buildPresaleSettings1155 } = require("../test/helpers/lib.js");

task("createNFTStandard1155", "Create NFT from the factory")
  .addParam("factoryAddress", "The factory contract address")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;
    const web3 = hre.web3;
    const RFOXFactory = await ethers.getContractFactory("RFOXFactoryStandard1155");
    const wei = web3.utils.toWei;

    const factoryAddress = taskArgs.factoryAddress;
    const rfoxFactory = await RFOXFactory.attach(factoryAddress);

    const antony_address = "0x9Dd5C813442a879b3594fA00E1fDf794fd0814c2";
    const santo_address = '0x6BbaF8dE2Da04d5F9933a9AdC2fC40fD125C0a6b';
    const testERC20TokenAddress = "0xE068e4A39128E40BB3bb122e10E1C297F9D16762";
    const saleStartTime = Math.round(Date.now() / 1000); // current time
    const saleEndTime = (Math.round(Date.now() / 1000) + 432000); // next 5 day

    const params = buildParamsStandard1155(
      "FIRST NFT",
      "FIRST",
      "https://ipfs::/",
      santo_address
    );

    console.log(params)
    
    const nftRes = await rfoxFactory.createNFT(params)

    const receipt = await nftRes.wait()

    const eventData = receipt.events[receipt.events.length - 1].args;
    console.log("New NFT Address: ", eventData['nftAddress']);

    const NFTContract = await ethers.getContractFactory("RFOXNFTStandard1155");
    const nftContract = await NFTContract.attach(eventData['nftAddress']);
    const tokenDataSettings = buildTokenSettings1155(
      0,
      10,
      wei("1000", "gwei"),
      30,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    );

    console.log(tokenDataSettings);

    await nftContract.updateTokenSettings(tokenDataSettings);
});


task("createNFTPresale1155", "Create NFT from the factory")
  .addParam("factoryAddress", "The factory contract address")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;
    const web3 = hre.web3;
    const RFOXFactory = await ethers.getContractFactory("RFOXFactoryWhitelist1155");

    const wei = web3.utils.toWei;

    const factoryAddress = taskArgs.factoryAddress;
    const rfoxFactory = await RFOXFactory.attach(factoryAddress);

    const antony_address = "0x9Dd5C813442a879b3594fA00E1fDf794fd0814c2";
    const santo_address = '0x6BbaF8dE2Da04d5F9933a9AdC2fC40fD125C0a6b';
    const testERC20TokenAddress = "0xE068e4A39128E40BB3bb122e10E1C297F9D16762";
    const saleStartTime = Math.round(Date.now() / 1000); // current time
    const saleEndTime = (Math.round(Date.now() / 1000) + 432000); // next 5 day

    const params = buildParamsStandard1155(
      "FIRST NFT",
      "FIRST",
      "https://ipfs::/",
      santo_address
    );
    console.log(params)
    
    const nftRes = await rfoxFactory.createNFT(params);

    const receipt = await nftRes.wait()

    const eventData = receipt.events[receipt.events.length - 1].args;
    console.log("New NFT Address: ", eventData['nftAddress']);

    const NFTContract = await ethers.getContractFactory("RFOXNFTWhitelist1155");
    const nftContract = await NFTContract.attach(eventData['nftAddress']);
    const tokenDataSettings = buildTokenSettings1155(
      0,
      10,
      wei("1000", "gwei"),
      30,
      saleStartTime,
      saleEndTime,
      constants.ZERO_ADDRESS,
      true
    );

    const whitelistSettings = buildPresaleSettings1155(
      saleStartTime,
      5,
      wei("500", "gwei"),
      constants.ZERO_BYTES32
    )

    console.log(tokenDataSettings);
    console.log(whitelistSettings);

    await nftContract.updateTokenSettings(tokenDataSettings, whitelistSettings);
});
