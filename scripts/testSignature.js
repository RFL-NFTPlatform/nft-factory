const salt = 1234567;
const keccak256 = require("keccak256");

const getSignature = async function (senderAddress, _salt) {
  const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
  console.log(account);

  const hashMsg = web3.utils.soliditySha3(senderAddress, _salt);
  const signature = await web3.eth.accounts.sign(hashMsg, account.privateKey);
  return signature;
}

task("generateSampleSignature", "Generate Sample Signature")
.addParam("salt", "Salt sample ")
.setAction(async (taskArgs, hre) => {
  const salt = taskArgs.salt;

  const sign = (await getSignature("0x9167FBAC997122F1Eb2B8c1757c2b4eF831a7440", salt));
  console.log("Sample signature: ", sign.signature);
});