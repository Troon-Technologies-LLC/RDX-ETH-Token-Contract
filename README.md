# RandomDEX (RDX) Token

## Overview
RandomDEX (RDX) is an ERC20 token built on Ethereum with advanced fee mechanisms, anti-bot protection, and role-based access control. The token is designed to provide a secure and flexible trading experience while protecting against common attack vectors.

## Token Information
- **Name**: RandomDEX
- **Symbol**: RDX
- **Total Supply**: To be determined (managed on Base blockchain)
- **Decimals**: 18 (standard ERC20)
- **Initial Liquidity**: To be determined
- **Expected Launch**: March 17-19, 2025

## Fee Structure
- **Launch Tax**: 25% for 20-30 seconds after listing (2500/10000)
- **Standard Tax**: 3% after initial period (300/10000)
- **Maximum Tax**: Modifiable up to 3% (300/10000)
- **Fee Denominator**: 10000 (for precise fee calculations)

## Features

### Fee Mechanism
- **Standard Trading Fees**: Applied on buys and sells through DEXs
- **Anti-Bot Protection**: Higher fee on trades during the initial period after listing
- **No Fees on P2P Transfers**: Regular wallet-to-wallet transfers have no fees
- **Fee Collection**: Fees can be claimed in RDX tokens or swapped to ETH via Uniswap

### Security Features
- **Role-Based Access Control**: Different permission levels for various operations
- **Transfer Restrictions**: Limited trading before official listing timestamp
- **Anti-Bot Measures**: Higher fees during initial trading period to discourage bot activity
- **Listing Timestamp Protection**: Prevents unauthorized transfers before the token is officially listed

### Listing Timestamp
- **Purpose**: Restricts token transfers before a specified time to prevent unauthorized trading
- **Implementation**: Only addresses with `ALLOWED_TRANSFER_FROM_ROLE` or `DEFAULT_ADMIN_ROLE` can transfer tokens before the listing timestamp
- **Configuration**: Listing timestamp can be set during deployment and modified by admin (only if not already passed)
- **Security**: Once the listing timestamp has passed, it cannot be changed again

## Smart Contract Architecture

### Main Contracts
- `RandomDEX.sol`: Core token implementation with fee mechanism and trading functions
- `RandomDEXErrors.sol`: Custom error definitions for better gas efficiency and error handling
- `ERC20Fee.sol`: Library implementing the fee calculation logic

### Roles
- `DEFAULT_ADMIN_ROLE`: Full administrative control over the contract
- `MINT_ROLE`: Permission to mint new tokens
- `BURN_ROLE`: Permission to burn tokens
- `DEX_ROLE`: Identifies DEX addresses for fee calculation
- `ALLOWED_TRANSFER_FROM_ROLE`: Addresses allowed to transfer before official listing

## Deployment Information

### Production Deployment
- **Initial Deployer**: 0xc1C6bac73cE0016cf67d4f4E511253ac353A7904
- **Fee Collector & Liquidity Recipient**: 0x5eee3BbE01f2f765305dF7A8647EB4d06a38f703
- **Uniswap V2 Router**: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

### Deployment Parameters
```
- feeCollector: 0x5eee3BbE01f2f765305dF7A8647EB4d06a38f703 (Gnosis Safe wallet)
- feeMaximumNumerator: 300 (3%)
- feeDenominator: 10000
- feeBuy: 300 (3%)
- feeSell: 300 (3%)
- antibotFeeBuy: 2500 (25%)
- antibotFeeSell: 2500 (25%)
- antibotEndTimestamp: To be determined (30 seconds after listing in March 2025)
- listingTimestamp: To be determined (when token becomes freely tradable in March 2025)
```

## Development and Testing

### Testing on Testnet
```bash
# Deploy to a testnet (e.g., Sepolia)
npx hardhat run scripts/deploy.js --network sepolia
```

## Contract Management

The contract includes several management functions that can be called after deployment:

### Update Fee Collector
Call the `updateFeeCollector` function to change the address that receives collected fees.

### Grant Roles
Use the `grantRole` function to assign different roles to addresses:
- Grant `DEFAULT_ADMIN_ROLE` for full administrative access
- Grant `DEX_ROLE` to identify DEX addresses for fee calculation
- Grant `MINT_ROLE` to allow an address to mint new tokens
- Grant `BURN_ROLE` to allow an address to burn tokens
- Grant `ALLOWED_TRANSFER_FROM_ROLE` to allow transfers before listing

### Set Listing Timestamp
Call the `setListingTimestamp` function to update when the token becomes freely tradable (can only be modified before the current timestamp passes).

### Fee Management
- Use `updateFees` to modify the standard fee rates (within maximum limits)
- Use `updateSlippageTolerance` to adjust the slippage tolerance for ETH swaps

### Fee Collection
- Call `claimFeeInRDX` to collect accumulated fees in RDX tokens
- Call `claimFeeInEth` to swap accumulated RDX fees to ETH and send to the fee collector

## License
UNLICENSED
