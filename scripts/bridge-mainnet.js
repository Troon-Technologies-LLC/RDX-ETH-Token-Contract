// RDX Token Bridge Script - MAINNET VERSION
// Base to Ethereum bridge using Interchain Token Service
// No Hardhat dependency, just ethers.js

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { AxelarQueryAPI, Environment, EvmChain, GasToken } = require('@axelar-network/axelarjs-sdk');

// Load environment variables from .env file
require('dotenv').config();

// ======== CONFIGURATION (EDIT THESE VALUES) ========
// Token and contract addresses - MAINNET VALUES
const BASE_TOKEN_ADDRESS = '0x2659631CfBE9B1b6DcBc1384a3864509356E7B4d'; // RDX token address on Base mainnet
const INTERCHAIN_SERVICE_ADDRESS = '0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C'; // Interchain Token Service on Base mainnet
const TOKEN_ID = '0xbfa51e4b7d4f3cb463f14124e0efc5f03261d756336898a057049925e2891a2c'; // Token ID for mainnet

// Network configuration
// Move API key to .env file for better security
const BASE_RPC_URL = 'https://base.drpc.org'; // Base mainnet RPC URL
const DESTINATION_CHAIN = 'Ethereum'; // Destination chain name for mainnet
const DESTINATION_ADDRESS = '0x6E236057972C9B0fcD2DaBe64f484812FA8bBD8E'; // Replace with recipient address on Ethereum

// Token amount to transfer
const AMOUNT_TO_TRANSFER = '5'; // Amount of tokens to transfer (will be converted to wei)

// Transaction settings
const MAX_GAS_PRICE = ethers.parseUnits('100', 'gwei'); // Maximum gas price to accept (in gwei)
const TX_TIMEOUT = 120000; // Transaction timeout in milliseconds (2 minutes)
const MAX_RETRIES = 3; // Maximum number of retries for failed transactions
const RETRY_DELAY = 5000; // Delay between retries in milliseconds

// ======== LOAD CONTRACT ABIs ========
// Load ABIs from JSON files with error handling
function loadABI(abiPath) {
  try {
    if (!fs.existsSync(abiPath)) {
      throw new Error(`ABI file not found: ${abiPath}`);
    }
    return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to load ABI from ${abiPath}: ${error.message}`);
    process.exit(1);
  }
}

const tokenAbiPath = path.join(__dirname, '../utils/RandomDEXBAbi.json');
const interchainAbiPath = path.join(__dirname, '../utils/interchainTokenServiceAbi.json');

const tokenABI = loadABI(tokenAbiPath);
const interchainABI = loadABI(interchainAbiPath);

// ======== AXELAR API SETUP ========
const api = new AxelarQueryAPI({ environment: Environment.MAINNET });

// ======== UTILITY FUNCTIONS ========
// Input validation
function validateInputs() {
  // Check for valid Ethereum addresses
  if (!ethers.isAddress(BASE_TOKEN_ADDRESS)) {
    throw new Error(`Invalid token address: ${BASE_TOKEN_ADDRESS}`);
  }
  if (!ethers.isAddress(INTERCHAIN_SERVICE_ADDRESS)) {
    throw new Error(`Invalid interchain service address: ${INTERCHAIN_SERVICE_ADDRESS}`);
  }
  if (!ethers.isAddress(DESTINATION_ADDRESS)) {
    throw new Error(`Invalid destination address: ${DESTINATION_ADDRESS}`);
  }

  // Check for valid token ID format (should be a hex string)
  if (!TOKEN_ID.startsWith('0x') || TOKEN_ID.length !== 66) {
    throw new Error(`Invalid token ID format: ${TOKEN_ID}`);
  }

  // Check for valid amount
  const amount = parseFloat(AMOUNT_TO_TRANSFER);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid transfer amount: ${AMOUNT_TO_TRANSFER}`);
  }
}

// Check network connection
async function checkNetworkConnection(provider) {
  try {
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Verify we're on Base mainnet (Chain ID 8453)
    if (network.chainId !== 8453n) {
      throw new Error(`Connected to wrong network. Expected Base mainnet (8453), got ${network.name} (${network.chainId})`);
    }
    
    return true;
  } catch (error) {
    console.error(`Network connection error: ${error.message}`);
    return false;
  }
}

// Gas estimator function with fallback
async function estimateGas(amount, tokenDecimals) {
  try {
    console.log('Estimating gas for cross-chain transfer...');
    
    const executeData = '0x';
    const gmpParams = {
      destinationContractAddress: DESTINATION_ADDRESS,
      sourceContractAddress: BASE_TOKEN_ADDRESS,
      tokenSymbol: 'ETH',
      transferAmount: ethers.parseUnits(amount, tokenDecimals).toString()
    };

    try {
      const gas = await api.estimateGasFee(
        EvmChain.BASE,
        EvmChain.ETHEREUM,
        3000000,
        1.3,
        GasToken.ETH,
        '0',
        executeData,
        gmpParams
      );
      
      console.log(`Gas estimation successful: ${gas}`);
      return gas;
    } catch (error) {
      console.error('Gas estimation failed, using fallback value');
      console.error(`- Error: ${error.message}`);
      return ethers.parseEther('0.01'); // Fallback gas amount
    }
  } catch (error) {
    console.error('Error in gas estimation:', error.message);
    return ethers.parseEther('0.01'); // Fallback gas amount
  }
}

// Check if gas price is reasonable
async function checkGasPrice(provider) {
  const gasPrice = await provider.getFeeData();
  console.log(`Current gas price: ${ethers.formatUnits(gasPrice.gasPrice || gasPrice.maxFeePerGas, 'gwei')} gwei`);
  
  const effectiveGasPrice = gasPrice.gasPrice || gasPrice.maxFeePerGas;
  
  if (effectiveGasPrice > MAX_GAS_PRICE) {
    console.warn(`WARNING: Gas price is very high (${ethers.formatUnits(effectiveGasPrice, 'gwei')} gwei)`);
    console.warn(`Maximum configured gas price is ${ethers.formatUnits(MAX_GAS_PRICE, 'gwei')} gwei`);
    
    // Ask for confirmation before proceeding
    console.warn('Do you want to proceed anyway? (Set MAX_GAS_PRICE higher to avoid this warning)');
    // In a real application, you might want to add user confirmation here
    // For this script, we'll just proceed with a warning
    return true;
  }
  
  return true;
}

// Send transaction with timeout and retry logic
async function sendTransactionWithRetry(txPromise, description) {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`${description} (Attempt ${attempt}/${MAX_RETRIES})...`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction timeout')), TX_TIMEOUT);
      });
      
      // Race the transaction against the timeout
      const tx = await Promise.race([txPromise, timeoutPromise]);
      console.log(`Transaction submitted: ${tx.hash}`);
      console.log('Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      // Validate receipt
      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }
      
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      return receipt;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      
      if (error.message.includes('timeout') || 
          error.message.includes('network') ||
          error.code === 'NETWORK_ERROR' ||
          error.code === 'TIMEOUT') {
        // These errors might be temporary, so we'll retry
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
      } else if (error.code === 'ACTION_REJECTED') {
        // User rejected the transaction, don't retry
        throw new Error('Transaction was rejected by the user');
      } else if (error.message.includes('insufficient funds')) {
        // Not enough ETH, don't retry
        throw new Error('Insufficient ETH for transaction. Please add more ETH to your wallet.');
      }
      
      // For other errors, if we haven't reached max retries, wait and try again
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw new Error(`${description} failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

// Enhanced error handler
function logError(message, error) {
  console.error(`${message}:`);
  console.error(`- Message: ${error.message}`);
  console.error(`- Code: ${error.code || 'N/A'}`);
  
  if (error.data) console.error(`- Data: ${error.data}`);
  
  // Handle specific error types
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.error('- Solution: Add more ETH to your wallet to cover gas fees');
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    console.error('- Solution: The transaction may be failing. Check your token approval and balance');
  } else if (error.code === 'NONCE_EXPIRED') {
    console.error('- Solution: Your transaction was replaced or dropped. Try again with a fresh nonce');
  } else if (error.message.includes('user rejected')) {
    console.error('- Solution: You rejected the transaction. Please approve it in your wallet if you want to proceed');
  }
}

// ======== MAIN BRIDGE FUNCTION ========
async function bridgeTokens() {
  // Check if private key is provided
  if (!process.env.PRIVATE_KEY) {
    console.error('ERROR: Private key not found in .env file');
    console.error('Please create a .env file with your PRIVATE_KEY');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('RDX TOKEN BRIDGE: BASE TO ETHEREUM (MAINNET)');
  console.log('='.repeat(50));
  
  try {
    // Validate inputs before proceeding
    validateInputs();
    
    // Create provider and signer
    console.log(`Connecting to Base mainnet...`);
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    
    // Check network connection
    if (!await checkNetworkConnection(provider)) {
      throw new Error('Failed to connect to network. Please check your internet connection and try again.');
    }
    
    // Check gas price
    await checkGasPrice(provider);
    
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const userAddress = await signer.getAddress();
    console.log(`Connected with address: ${userAddress}`);

    // Create contract instances
    const tokenContract = new ethers.Contract(BASE_TOKEN_ADDRESS, tokenABI, signer);
    const interchainContract = new ethers.Contract(INTERCHAIN_SERVICE_ADDRESS, interchainABI, signer);

    // Get token details
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();
    const tokenDecimals = await tokenContract.decimals();
    console.log(`Token: ${tokenName} (${tokenSymbol})`);

    // Check token balance
    const balance = await tokenContract.balanceOf(userAddress);
    console.log(`Your balance: ${ethers.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);

    // Convert amount to wei
    const amountInWei = ethers.parseUnits(AMOUNT_TO_TRANSFER, tokenDecimals);
    
    if (balance < amountInWei) {
      throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, tokenDecimals)} ${tokenSymbol} but trying to transfer ${AMOUNT_TO_TRANSFER} ${tokenSymbol}`);
    }

    // Check ETH balance for gas
    const ethBalance = await provider.getBalance(userAddress);
    const estimatedGas = await estimateGas(AMOUNT_TO_TRANSFER, tokenDecimals);
    console.log(`Your ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    console.log(`Estimated gas needed: ${ethers.formatEther(estimatedGas)} ETH`);
    
    if (ethBalance < estimatedGas) {
      throw new Error(`Insufficient ETH for gas. You have ${ethers.formatEther(ethBalance)} ETH but need approximately ${ethers.formatEther(estimatedGas)} ETH`);
    }

    // Check existing allowance
    const currentAllowance = await tokenContract.allowance(userAddress, INTERCHAIN_SERVICE_ADDRESS);
    console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, tokenDecimals)} ${tokenSymbol}`);
    
    // Step 1: Approve tokens (only if needed)
    if (currentAllowance < amountInWei) {
      console.log('\nSTEP 1: Approving tokens for the Interchain Token Service...');
      console.log(`Approving ${AMOUNT_TO_TRANSFER} ${tokenSymbol} tokens...`);
      
      const approveTx = () => tokenContract.approve(INTERCHAIN_SERVICE_ADDRESS, amountInWei);
      await sendTransactionWithRetry(approveTx(), 'Token approval');
      
      // Verify allowance after approval
      const newAllowance = await tokenContract.allowance(userAddress, INTERCHAIN_SERVICE_ADDRESS);
      console.log(`New allowance: ${ethers.formatUnits(newAllowance, tokenDecimals)} ${tokenSymbol}`);
      
      if (newAllowance < amountInWei) {
        throw new Error('Approval failed. Allowance is still insufficient.');
      }
    } else {
      console.log('\nSTEP 1: Token approval already sufficient, skipping approval step');
    }

    // Step 2: Estimate gas for cross-chain transfer
    console.log('\nSTEP 2: Estimating gas for cross-chain transfer...');
    const gasAmount = await estimateGas(AMOUNT_TO_TRANSFER, tokenDecimals);
    console.log(`Gas amount: ${ethers.formatEther(gasAmount)} ETH`);

    // Step 3: Transfer tokens
    console.log('\nSTEP 3: Transferring tokens to Ethereum...');
    console.log(`Sending ${AMOUNT_TO_TRANSFER} ${tokenSymbol} tokens to ${DESTINATION_ADDRESS} on ${DESTINATION_CHAIN}`);
    
    const transferTx = () => interchainContract.interchainTransfer(
      TOKEN_ID,
      DESTINATION_CHAIN,
      DESTINATION_ADDRESS,
      amountInWei,
      '0x', // No additional data
      gasAmount,
      { value: gasAmount } // Pay for gas
    );
    
    const transferReceipt = await sendTransactionWithRetry(transferTx(), 'Token transfer');
    
    console.log('\nSUCCESS! Tokens are being bridged to Ethereum');
    console.log('The tokens will arrive on Ethereum in approximately 10-20 minutes');
    console.log(`You can track the transfer at: https://axelarscan.io/gmp/${transferReceipt.hash}`);
    
    // Verify final balance
    const finalBalance = await tokenContract.balanceOf(userAddress);
    console.log(`\nFinal balance: ${ethers.formatUnits(finalBalance, tokenDecimals)} ${tokenSymbol}`);
    console.log(`Tokens sent: ${AMOUNT_TO_TRANSFER} ${tokenSymbol}`);
    
    // Exit the process successfully
    console.log('\nScript execution completed successfully. Exiting...');
    process.exit(0);
    
  } catch (error) {
    logError('Bridge operation failed', error);
    process.exit(1);
  }
}

// ======== SCRIPT EXECUTION ========
// Run the bridge function
bridgeTokens().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});