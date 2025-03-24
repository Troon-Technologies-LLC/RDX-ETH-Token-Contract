const { ethers } = require("hardhat");

async function main() {
  const accounts = await ethers.getSigners();
  const secondAccount = accounts[1]; // Swapper: 0x6E236057972C9B0fcD2DaBe64f484812FA8bBD8E
  console.log(`🔹 Swapping from: ${secondAccount.address}`);

  // Uniswap V2 Router & Token Addresses (Sepolia Testnet)
  const UNISWAP_ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const RDX_TOKEN = "0xAdC3f836b60Cea62204bdf05bdaa4f998441A2C8";
  const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

  // Contract instances
  const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER, secondAccount);
  const rdxToken = await ethers.getContractAt("IERC20", RDX_TOKEN, secondAccount);

  // Swap parameters
  const amountIn = ethers.parseUnits("100", 18); // 100 RDX
  const amountOutMin = 0; // Accept any ETH
  const path = [RDX_TOKEN, WETH_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes

  // Check balance
  const balance = await rdxToken.balanceOf(secondAccount.address);
  console.log(`🔹 RDX Balance: ${ethers.formatUnits(balance, 18)}`);
  if (balance < amountIn) {
    console.log("❌ Not enough RDX balance to swap.");
    return;
  }

  // Check and set allowance
  const allowance = await rdxToken.allowance(secondAccount.address, UNISWAP_ROUTER);
  console.log(`🔹 Current Allowance: ${ethers.formatUnits(allowance, 18)}`);

  if (allowance < amountIn) {
    console.log("⏳ Approving Uniswap Router to spend RDX...");
    const approveTx = await rdxToken.approve(UNISWAP_ROUTER, amountIn);
    const approveReceipt = await approveTx.wait(1); // Wait for confirmation
    console.log("✅ Approval confirmed! TX Hash:", approveReceipt.hash);

    // Verify allowance post-approval
    const newAllowance = await rdxToken.allowance(secondAccount.address, UNISWAP_ROUTER);
    console.log(`🔹 New Allowance: ${ethers.formatUnits(newAllowance, 18)}`);
  }

  // Perform swap with explicit gas limit
  console.log(`🔄 Swapping ${ethers.formatUnits(amountIn, 18)} RDX for ETH (with fee deduction)...`);
  try {
    const swapTx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      amountIn,
      amountOutMin,
      path,
      secondAccount.address,
      deadline,
      { gasLimit: 300000 } // Increase gas limit
    );
    const receipt = await swapTx.wait(1);
    console.log("✅ Swap Successful! TX Hash:", receipt.hash);

    // Log ETH balance after swap
    const ethBalance = await ethers.provider.getBalance(secondAccount.address);
    console.log(`🔹 ETH Balance after swap: ${ethers.formatUnits(ethBalance, 18)}`);
  } catch (error) {
    console.error("❌ Swap Failed:", error.message);
    if (error.data) {
      console.log("Revert Reason:", ethers.AbiCoder.defaultAbiCoder().decode(["string"], error.data)[0]);
    }
  }
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });