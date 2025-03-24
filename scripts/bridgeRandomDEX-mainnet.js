// Import dependencies
const { ethers } = require("hardhat");
const crypto = require("crypto");
const {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} = require("@axelar-network/axelarjs-sdk");

// Load environment variables
require("dotenv").config();


// ABIs for the contracts
const interchainTokenServiceContractABI = require("../utils/interchainTokenServiceAbi.json");
const interchainTokenFactoryContractABI = require("../utils/interchainTokenFactoryABI.json");
const ethRandomDEXTokenABI = require("../utils/RandomDEXAbi.json");
const baseRandomDEXTokenABI = require("../utils/RandomDEXBAbi.json");

// Constants
const MINT_BURN = 4;
const LOCK_UNLOCK = 2;

// Contract addresses
const interchainTokenServiceContractAddress = process.env.INTERCHAIN_SERVICE_CONTRACT_ADDRESS;
const baseRandomDEXTokenAddress = process.env.BASE_RANDOMDEX_CONTRACT_ADDRESS;
const ethRandomDEXTokenAddress = process.env.ETH_RANDOMDEX_CONTRACT_ADDRESS;
const interchainTokenFactoryContractAddress = process.env.INTERCHAIN_FACTORY_CONTRACT_ADDRESS;

// Initialize Axelar APIs
const api = new AxelarQueryAPI({ environment: Environment.MAINNET });

// Chain names for Axelar Mainnet
const BASE_CHAIN_NAME = "base"; // Base chain name on Axelar mainnet
const ETHEREUM_CHAIN_NAME = "Ethereum"; // Ethereum chain name on Axelar mainnet

// Utility to create a signer instance
async function getSigner(rpcUrl, privateKey) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

// Utility to create a contract instance
async function getContractInstance(contractAddress, contractABI, signer) {
  return new ethers.Contract(contractAddress, contractABI, signer);
}
async function gasEstimatorForEth(amount) {
  try {
    const executeData = "0x";

    const gmpParams = {
      destinationContractAddress: process.env.BASE_RECEIVER_ADDRESS,
      sourceContractAddress: process.env.ETH_SENDER_ADDRESS,
      tokenSymbol: "ETH",
      transferAmount: ethers.parseEther(amount).toString()
    };

    const gas = await api.estimateGasFee(
      EvmChain.ETHEREUM,
      EvmChain.BASE,
      3000000,  // Increased gas limit
      1.3,      // Increased multiplier for better estimation
      GasToken.ETH,
      "0",
      executeData,
      gmpParams
    );

    return gas;
  } catch (error) {
    handleError("Error estimating gas", error);
    console.error("Detailed gas estimation error:", error);
    throw error;
  }
}

// Register token metadata for Base blockchain
async function registerTokenMetadataOnBase() {
  try{
    const signer = await getSigner(process.env.BASE_MAINNET_RPC_URL, process.env.PRIVATE_KEY);
    const interchainTokenServiceContract = await getContractInstance(
      interchainTokenServiceContractAddress,
      interchainTokenServiceContractABI,
      signer
    );

    // Step 1: Register token metadata with new error handling
    const registerMetadataTx = await interchainTokenServiceContract.registerTokenMetadata(
      baseRandomDEXTokenAddress,
      ethers.parseEther("0.0001"),
      { value: ethers.parseEther("0.0001") }
    );
    
    console.log("Register Metadata Transaction Hash:", registerMetadataTx.hash);
  } catch (error) {
    if (error.message.includes("ExecuteWithTokenNotSupported")) {
      console.error("Error: Token execution not supported. Please verify token configuration.");
    } else if (error.message.includes("GatewayToken")) {
      console.error("Error: Invalid gateway token. Please check token address.");
    } else {
      handleError("Error deploying Token Manager on Base", error);
    }
    throw error;
  }
}
// Register token metadata for Ethereum blockchain
async function registerTokenMetadataOnEth() {
  try{const signer = await getSigner(process.env.ETH_MAINNET_RPC_URL, process.env.PRIVATE_KEY);
    const interchainTokenServiceContract = await getContractInstance(
      interchainTokenServiceContractAddress,
      interchainTokenServiceContractABI,
      signer
    );

    // Step 1: Register token metadata with new error handling
    const registerMetadataTx = await interchainTokenServiceContract.registerTokenMetadata(
      ethRandomDEXTokenAddress,
      ethers.parseEther("0.0001"),
      { value: ethers.parseEther("0.0001") }
    );
    
    console.log("Register Metadata Transaction Hash:", registerMetadataTx.hash);
  } catch (error) {
    if (error.message.includes("ExecuteWithTokenNotSupported")) {
      console.error("Error: Token execution not supported. Please verify token configuration.");
    } else if (error.message.includes("GatewayToken")) {
      console.error("Error: Invalid gateway token. Please check token address.");
    } else {
      handleError("Error deploying Token Manager on Base", error);
    }
    throw error;
  }
}
async function registerCustomTokenOnBase() {
  // Generate random salt
  const salt = "0x" + crypto.randomBytes(32).toString("hex");
  // Get a signer to sign the transaction
  const signer = await getSigner(process.env.BASE_MAINNET_RPC_URL, process.env.PRIVATE_KEY);
 
  // Get the interchainTokenFactory contract instance
  const interchainTokenFactoryContract = await getContractInstance(
    interchainTokenFactoryContractAddress,
    interchainTokenFactoryContractABI,
    signer,
  );

  // Register token metadata
  const deployTxData = await interchainTokenFactoryContract.registerCustomToken(
    salt, // salt
    baseRandomDEXTokenAddress, // token address
    LOCK_UNLOCK, // token management type
    signer.address, // Address who has deployed the rdx token contract  
    { value: ethers.parseEther("0.001") },
  );

  console.log(`
    Transaction Hash: ${deployTxData.hash},
    salt: ${salt}`);
}
async function linkCustomToken() {
  // Get a signer to sign the transaction
  const signer = await getSigner(process.env.BASE_MAINNET_RPC_URL, process.env.PRIVATE_KEY);
  // Get the interchainTokenFactory contract instance
  const interchainTokenFactoryContract = await getContractInstance(
    interchainTokenFactoryContractAddress,
    interchainTokenFactoryContractABI,
    signer,
  );

  // Register token metadata
  const deployTxData = await interchainTokenFactoryContract.linkToken(
    process.env.TOKEN_SALT, // salt, same as previously used
    ETHEREUM_CHAIN_NAME, // destination chain on mainnet 
    ethRandomDEXTokenAddress, // destination token address
    MINT_BURN, // token manager type
    signer.address, // Address who has deployed the rdx token contract 
    ethers.parseEther("0.001"), // gas value
    { value: ethers.parseEther("0.001") },
  );

  console.log(`Transaction Hash: ${deployTxData.hash}`);
}
async function getTokenManagerAddress() {
  // Get a signer to sign the transaction
  const signer = await getSigner(process.env.BASE_MAINNET_RPC_URL, process.env.PRIVATE_KEY);

  // Get the interchainTokenFactory contract instance
  const interchainTokenFactoryContract = await getContractInstance(
    interchainTokenFactoryContractAddress,
    interchainTokenFactoryContractABI,
    signer,
  );  
  const interchainTokenServiceContract = await getContractInstance(
    interchainTokenServiceContractAddress,
    interchainTokenServiceContractABI,
    signer
  );


  // Register token metadata
  const tokenId = await interchainTokenFactoryContract.linkedTokenId(
    signer.address, // sender
    process.env.TOKEN_SALT, // salt, same as previously used
  );

  const tokenManagerAddress =
    await interchainTokenServiceContract.tokenManagerAddress(tokenId);

  console.log(`
    Token Manager Address: ${tokenManagerAddress},
    Token ID: ${tokenId}`);
}
// Transfer mint access on all chains to the Expected Token Manager : BSC
async function transferMintAccessToTokenManagerOnEth() {
  try {
    const signer = await getSigner(process.env.ETH_MAINNET_RPC_URL, process.env.PRIVATE_KEY);

    const tokenContract = await getContractInstance(
      ethRandomDEXTokenAddress,
      ethRandomDEXTokenABI,
      signer
    );

    const minterRole = await tokenContract.MINT_ROLE();
    const burnRole = await tokenContract.BURN_ROLE();

    const grantMinterTx = await tokenContract.grantRole(
      minterRole,
      process.env.TOKEN_MANAGER_ADDRESS // Token Manager Address for Ethereum
    );
    console.log("Grant Minter Role Transaction Hash:", grantMinterTx.hash);

    const grantBurnTx = await tokenContract.grantRole(
      burnRole,
      process.env.TOKEN_MANAGER_ADDRESS // Token Manager Address for Ethereum
    );
    console.log("Grant Burn Role Transaction Hash:", grantBurnTx.hash);
  } catch (error) {
    handleError("Error transferring mint access on Ethereum", error);
  }
}
async function approveTokensOnBase() {
  try {
    const signer = await getSigner(process.env.BASE_MAINNET_RPC_URL, process.env.PRIVATE_KEY);

    const tokenContract = await getContractInstance(
      baseRandomDEXTokenAddress,
      baseRandomDEXTokenABI,
      signer
    );

    const approveTx = await tokenContract.approve(
      interchainTokenServiceContractAddress,
      ethers.parseEther("20000000")
    );
    console.log("Approve Transaction Hash:", approveTx.hash);
  } catch (error) {
    handleError("Error approving tokens on Base", error);
  }
}
// Transfer tokens from Base to Ethereum
async function transferTokensBaseToEth() {
  try {
    const signer = await getSigner(process.env.BASE_MAINNET_RPC_URL, process.env.PRIVATE_KEY);

    const interchainTokenServiceContract = await getContractInstance(
      interchainTokenServiceContractAddress,
      interchainTokenServiceContractABI,
      signer
    );

    const gasAmount = await gasEstimatorForEth("20000000");
    console.log(`Gas amount: ${gasAmount}`);

    const transferTx = await interchainTokenServiceContract.interchainTransfer(
      process.env.TOKEN_ID,
      ETHEREUM_CHAIN_NAME,
      process.env.CLIENT_ADDRESS,
      ethers.parseEther("20000000"),
      "0x",
      gasAmount,
      { value: gasAmount }
    );

    console.log("Transfer Transaction Hash:", transferTx.hash);
  } catch (error) {
    handleError("Error transferring tokens from Base to Ethereum", error);
  }
}
async function approveTokensOnEth() {
  try {
    const signer = await getSigner(process.env.ETH_MAINNET_RPC_URL, process.env.PRIVATE_KEYY);

    const tokenContract = await getContractInstance(
      ethRandomDEXTokenAddress,
      ethRandomDEXTokenABI,
      signer
    );

    const approveTx = await tokenContract.approve(
      interchainTokenServiceContractAddress,
      ethers.parseEther("10")
    );
    console.log("Approve Transaction Hash:", approveTx.hash);
  } catch (error) {
    handleError("Error approving tokens on Ethereum", error);
  }
}
// Transfer tokens from Ethereum to Base
async function transferTokensEthToBase() {
  try {
    const signer = await getSigner(process.env.ETH_MAINNET_RPC_URL, process.env.PRIVATE_KEYY);
    const interchainTokenServiceContract = await getContractInstance(
      interchainTokenServiceContractAddress,
      interchainTokenServiceContractABI,
      signer
    );

    const gasAmount = await gasEstimatorForEth("5");
    console.log(`Gas amount: ${gasAmount}`);
    
    const metadata = "0x";

    const transferTx = await interchainTokenServiceContract.interchainTransfer(
      process.env.TOKEN_ID,
      BASE_CHAIN_NAME,
      process.env.BASE_RECEIVER_ADDRESS,
      ethers.parseEther("5"),
      metadata,
      gasAmount,
      { value: gasAmount }
    );

    console.log("Transfer Transaction Hash:", transferTx.hash);
    const receipt = await transferTx.wait();

  
    console.log(`Successfully initiated transfer of tokens from Ethereum to Base`);
    return receipt.hash;
  } catch (error) {
    handleError("Error transferring tokens from Ethereum to Base", error);
    throw error;
  }
}
// Error handler
function handleError(message, error) {
  console.error(`${message}:`, error);
  console.error("Error details:", {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    data: error.data
  });
}

// Main entry point
async function main() {
  const functionName = process.env.FUNCTION_NAME;
  switch (functionName) {
    case "registerTokenMetadataOnBase":
      await registerTokenMetadataOnBase();
      break;
    case "registerTokenMetadataOnEth":
      await registerTokenMetadataOnEth();
      break;
    case "registerCustomTokenOnBase":
      await registerCustomTokenOnBase();
      break;
    case "linkCustomToken":
      await linkCustomToken();
      break;
    case "getTokenManagerAddress":
      await getTokenManagerAddress();
      break;
    case "transferMintAccessToTokenManagerOnEth":
      await transferMintAccessToTokenManagerOnEth();
      break;
    case "approveTokensOnBase":
      await approveTokensOnBase();
      break;
    case "transferTokensBaseToEth":
      await transferTokensBaseToEth();
      break;
    case "approveTokensOnEth":
      await approveTokensOnEth();
      break;
    case "transferTokensEthToBase":
      await transferTokensEthToBase();
      break;
    case "checkGasEstimation":
      await checkGasEstimation();
      break;
    default:
      console.error(`Unknown function: ${functionName}`);
      process.exitCode = 1;
  }
}
// Execute main function if running directly
if (require.main === module) {
  main().catch((error) => handleError("Unhandled error in main function", error));
}
