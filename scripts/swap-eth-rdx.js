const { ethers } = require("hardhat");

async function main() {
  const accounts = await ethers.getSigners(); // Get all accounts
  const secondAccount = accounts[1]; // Use second account
  console.log(`🔹 Swapping from: ${secondAccount.address}`);

  // ✅ Uniswap V2 Router & Token Addresses (Sepolia Testnet)
  const UNISWAP_ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const RDX_TOKEN = "0xbf6763ae2eF02578FfFbBE91A830382279f1b425";
  const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

  // ✅ Bind the Uniswap Router to secondAccount
  const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER, secondAccount);

  const amountInETH = ethers.parseUnits("0.001", 18); // Swap 0.001 WETH for RDX
  const amountOutMin = 0; // Accept any amount of RDX (set slippage accordingly)
  const path = [WETH_ADDRESS, RDX_TOKEN];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now

  console.log(`🔄 Swapping ${ethers.formatUnits(amountInETH, 18)} ETH for RDX (with fees applied)...`);

  // ✅ Use `swapExactETHForTokensSupportingFeeOnTransferTokens`
  const swapTx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
    amountOutMin,
    path,
    secondAccount.address, // Receive RDX in your wallet
    deadline,
    { value: amountInETH, from: secondAccount.address } // Explicitly send ETH from secondAccount
  );

  await swapTx.wait();
  console.log("✅ Swap Successful! Check RDX balance.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
