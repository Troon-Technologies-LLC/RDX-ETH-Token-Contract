# RDX Token Bridge

Simple script to bridge RDX tokens from Base to Ethereum using Axelar Interchain Token Service.

## Quick Setup

1. **Install Dependencies**
   ```bash
   npm install ethers@6.x.x @axelar-network/axelarjs-sdk dotenv
   ```

2. **Create .env File**
   Create a file named `.env` with:
   ```
   PRIVATE_KEY=your_wallet_private_key
   ```

3. **Run the Bridge**
   ```bash
   # For mainnet
   node scripts/bridge-mainnet.js
   ```

## Requirements

- Node.js v14+
- RDX tokens on Base network
- ETH for gas fees (~0.01 ETH)

## What to Expect

The script will:
1. Connect to your wallet
2. Check balances
3. Approve tokens (if needed)
4. Transfer tokens to Ethereum
5. Provide a tracking link

Tokens typically arrive on Ethereum in 10-20 minutes.

## Configuration (Optional)

In the bridge script, you can modify:
- `DESTINATION_ADDRESS`: Recipient address on Ethereum
- `AMOUNT_TO_TRANSFER`: Number of tokens to send

## Security Note

Keep your private key secure. Never share your `.env` file.
