// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

/**
 * @title RandomDEXErrors
 * @notice Defines errors for the RandomDEX Token contract.
 */
interface RandomDEXErrors {
    /**
     * @dev Thrown when a provided address is invalid.
     */
    error InvalidAddress();

    /**
     * @dev Thrown when the max supply is set to an invalid value.
     */
    error InvalidMaxSupplyValue();

    /**
     * @dev Thrown when an invalid token amount (zero or negative).
     */
    error InvalidTokenAmount();

    /**
     * @dev Thrown when an operation exceeds the maximum token supply.
     */
    error MaxSupplyExceeded();

    /**
     * @dev Thrown when attempting to claim fees but the contract holds insufficient balance.
     */
    error InsufficientClaimAmount();

    /**
     * @dev Thrown when attempting to swap but the provided amount is insufficient.
     */
    error InsufficientSwapAmount();

    /**
     * @dev Thrown when a Uniswap token swap transaction fails.
     */
    error SwapFailed();
    
    /**
     * @dev Thrown when a transfer is attempted during the supervised period by an unauthorized account.
     */
    error SupervisedTransferRestricted();
     
    /**
     * @dev Thrown when trying to change listing timestamp after token is already listed.
     */
    error TokenAlreadyListed();

}