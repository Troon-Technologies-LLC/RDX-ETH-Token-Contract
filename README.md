# RandomDEX Token Contract - Audit Information

## Overview
RandomDEX (RDX) is an ERC20 custom token contract that implements a fee mechanism on DEX trades. The contract applies two types of fees:
1. **Normal Fee**: Standard fee applied during regular trading (2%)
2. **Anti-Bot Fee**: Higher fee applied during a configurable period after token listing (25%)

## Contract Files
- `RandomDEX.sol`: Main token contract implementing ERC20 standard with fee mechanism
- `RandomDEXErrors.sol`: Custom error definitions
- `ERC20Fee.sol`: Library implementing the fee calculation logic

## Key Functionality
- Fees are only applied on DEX trades (buys and sells)
- Regular wallet-to-wallet transfers have no fees
- Anti-bot protection with higher fees during initial listing period
- Role-based access control for administrative functions
- Fee claiming mechanism (in RDX or ETH via Uniswap)

## Constructor Parameters

```solidity
constructor(
    address defaultAdmin_,             // Admin address
    address feeCollector_,             // Fee receiver address
    uint16 feeMaximumNumerator_,       // Maximum fee numerator (300 for 3%)
    uint16 feeDenominator_,            // Fee denominator (10000)
    Fees memory fees_,                 // Normal fees {buy: 200, sell: 200}
    Fees memory antiBotFees_,          // Anti-bot fees {buy: 2500, sell: 2500}
    uint256 antibotEndTimestamp_,      // When anti-bot protection ends
    address uniswapRouter_,            // Uniswap V2 Router address
    uint256 listingTimestamp_          // When token becomes freely tradable
)
```

## Fee Calculation
```
fee = (value * feeNumerator) / feeDenominator
```
- Normal trading: feeNumerator = 200 (2%)
- Anti-bot period: feeNumerator = 2500 (25%)
- feeDenominator = 10000

## Role-Based Access Control
- `DEFAULT_ADMIN_ROLE`: Full administrative control
- `MINT_ROLE`: Ability to mint new tokens
- `BURN_ROLE`: Ability to burn tokens
- `DEX_ROLE`: Identifies DEX addresses for fee calculation
- `ALLOWED_TRANSFER_FROM_ROLE`: Addresses allowed to transfer before listing

## Key Features and Risk Areas

### Fee Mechanism
- Fees are only applied on DEX trades (when either sender or recipient has DEX_ROLE)
- Anti-bot mechanism applies higher fees during initial period after listing
- Fee calculation uses high precision denominator (10000) for accuracy

### Access Control System
- Role-based permission system controls critical functions
- Special roles for DEX addresses and pre-listing transfers

### Transfer Restrictions
- Transfers before listing timestamp are restricted to authorized addresses
- Listing timestamp can only be modified before token is listed

### Fee Collection
- Fees are collected in RDX tokens and stored in the contract
- Admin can claim fees in RDX or swap for ETH via Uniswap

### External Integrations
- Uniswap V2 integration for swapping RDX to ETH
- Swap functionality handles slippage and deadline parameters

### Timestamp-Dependent Logic
- Anti-bot protection relies on accurate timestamp comparison
- Listing restrictions depend on timestamp validation
