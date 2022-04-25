const { constants } = require("@openzeppelin/test-helpers");
const { decodeLogs, buildParams, buildParamsStandard } = require("../test/helpers/lib.js");

task("createNFTStandard", "Create NFT from the factory")
  .addParam("factoryAddress", "The factory contract address")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;
    const web3 = hre.web3;
    const RFOXFactory = await ethers.getContractFactory("RFOXFactoryStandard");
    const wei = web3.utils.toWei;

    const factoryAddress = taskArgs.factoryAddress;
    const rfoxFactory = await RFOXFactory.attach(factoryAddress);

    const antony_address = "0x9Dd5C813442a879b3594fA00E1fDf794fd0814c2";
    const santo_address = '0x6BbaF8dE2Da04d5F9933a9AdC2fC40fD125C0a6b';
    const testERC20TokenAddress = "0xE068e4A39128E40BB3bb122e10E1C297F9D16762";
    const saleStartTime = Math.round(Date.now() / 1000); // current time
    const saleEndTime = (Math.round(Date.now() / 1000) + 432000); // next 5 day

    const params = buildParamsStandard(
      "FIRST NFT",
      "FIRST",
      "https://ipfs::/",
      constants.ZERO_ADDRESS,
      wei("1000", "gwei"),
      30,
      10,
      saleStartTime,
      saleEndTime,
      antony_address
    );
    console.log(params)
    
    const nftRes = await rfoxFactory.createNFT(params)

    const receipt = await nftRes.wait()

    const eventData = receipt.events[receipt.events.length - 1].args;
    console.log("New NFT Address: ", eventData['nftAddress']);
});


task("createNFTPresale", "Create NFT from the factory")
  .addParam("factoryAddress", "The factory contract address")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;
    const web3 = hre.web3;
    const RFOXFactory = await ethers.getContractFactory("RFOXFactoryWhitelist");

    const wei = web3.utils.toWei;

    const factoryAddress = taskArgs.factoryAddress;
    const rfoxFactory = await RFOXFactory.attach(factoryAddress);

    const antony_address = "0x9Dd5C813442a879b3594fA00E1fDf794fd0814c2";
    const santo_address = '0x6BbaF8dE2Da04d5F9933a9AdC2fC40fD125C0a6b';
    const testERC20TokenAddress = "0xE068e4A39128E40BB3bb122e10E1C297F9D16762";
    const saleStartTime = Math.round(Date.now() / 1000); // current time
    const saleEndTime = (Math.round(Date.now() / 1000) + 432000); // next 5 day

    const params = buildParams(
      "FIRST NFT",
      "FIRST",
      "https://ipfs::/",
      constants.ZERO_ADDRESS,
      wei("1000", "gwei"),
      30,
      10,
      saleStartTime,
      saleEndTime,
      saleStartTime,
      30,
      5,
      wei("500", "gwei"),
      antony_address
    );
    console.log(params)
    
    const nftRes = await rfoxFactory.createNFT(params);

    const receipt = await nftRes.wait()

    const eventData = receipt.events[receipt.events.length - 1].args;
    console.log("New NFT Address: ", eventData['nftAddress']);
});
