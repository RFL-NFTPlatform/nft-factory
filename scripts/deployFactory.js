task("deployFactory", "Deploy RFOX NFT Factory based on type")
.addParam("factoryType", "The factory type -- 1: Standard; 2: Standard+Bot Prevention; 3: Whitelist; 4: Whitelist+Bot Prevention")
.setAction(async (taskArgs, hre) => {
  const factoryType = taskArgs.factoryType;
  const ethers = hre.ethers;
  let RFOXNFTFactory;
  if(factoryType == 1) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryStandard");
  } else if (factoryType == 2) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryStandardBotPrevention");
  } else if (factoryType == 3) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryWhitelist");
  } else if (factoryType == 4) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryWhitelistBotPrevention");
  }

  const RFOXFactory = await RFOXNFTFactory.deploy();

  console.log("Factory deployed at: ", RFOXFactory.address);
});


task("deployFactory1155", "Deploy RFOX NFT Factory based on type")
.addParam("factoryType", "The factory type -- 1: Standard; 2: Standard+Bot Prevention; 3: Whitelist; 4: Whitelist+Bot Prevention")
.setAction(async (taskArgs, hre) => {
  const factoryType = taskArgs.factoryType;
  const ethers = hre.ethers;
  let RFOXNFTFactory;
  if(factoryType == 1) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryStandard1155");
  } else if (factoryType == 2) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryStandardBotPrevention1155");
  } else if (factoryType == 3) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryWhitelist1155");
  } else if (factoryType == 4) {
    RFOXNFTFactory = await ethers.getContractFactory("RFOXFactoryWhitelistBotPrevention1155");
  }

  const RFOXFactory = await RFOXNFTFactory.deploy();

  console.log("Factory deployed at: ", RFOXFactory.address);
});