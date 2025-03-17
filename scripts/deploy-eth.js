const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying RandomDEX with account:", deployer.address);

  // Constructor parameters
  const defaultAdmin = deployer.address;
  const feeCollector = deployer.address; // Third account from metamask Fee collector address
  const feeMaximumNumerator = 300; // 3% maximum fee
  const feeDenominator = 10000; // Denominator for fee calculation
  const fees = {
    buy: 300,  // 3% buy fee
    sell: 300  // 3% sell fee
  };
  const antiBotFees = {
    buy: 2500,  // 25% antibot buy fee
    sell: 2500  // 25% antibot sell fee
  };
  const antibotEndTimestamp = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now
  const uniswapRouter = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"; // Uniswap V2 Router for Sepolia Testnet
  // Todo
  const listingTimestamp = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now Will change it to 1 day 

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