const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying RandomDEX with account:", deployer.address);

  // Constructor parameters
  const defaultAdmin = deployer.address;
  const feeCollector = "0x5eee3BbE01f2f765305dF7A8647EB4d06a38f703"; // Client Fee collector address
  const feeMaximumNumerator = 500; // 5% maximum fee
  const feeDenominator = 10000; // Denominator for fee calculation
  const fees = {
    buy: 300,  // 3% buy fee
    sell: 300  // 3% sell fee
  };
  const antiBotFees = {
    buy: 2500,  // 25% antibot buy fee
    sell: 2500  // 25% antibot sell fee
  };
  const antibotEndTimestamp = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
  const uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router for Mainnet
  // 1 week from now
  const listingTimestamp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

  // Explicitly specify the contract from RandomDEX.sol
  const RandomDEX = await ethers.getContractFactory("contracts/RandomDEX.sol:RandomDEX");
  const randomDEX = await RandomDEX.deploy(
    defaultAdmin,
    feeCollector,
    feeMaximumNumerator,
    feeDenominator,
    fees,
    antiBotFees,
    antibotEndTimestamp,
    uniswapRouter,
    listingTimestamp
    );

  await randomDEX.waitForDeployment();
  const randomDEXAddress = await randomDEX.getAddress();
  console.log("RandomDEX deployed to:", randomDEXAddress);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await randomDEX.deploymentTransaction().wait(6);

  // Verify the contract on Sepolia (using Etherscan)
  console.log("Verifying contract..."); 
  try {
    await hre.run("verify:verify", {
      address: randomDEXAddress,
      constructorArguments: [
        defaultAdmin,
        feeCollector,
        feeMaximumNumerator,
        feeDenominator,
        fees,
        antiBotFees,  
        antibotEndTimestamp,
        uniswapRouter,
        listingTimestamp
      ],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Contract is already verified!");
    } else {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });