// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../libraries/ERC20Fee.sol";
import "./RandomDEXErrors.sol";

/**
 * @title RandomDEX
 * @notice An implementation of RandomDEX token smart contract on Ethereum.
 */
contract RandomDEX is
    ERC20,
    ERC20Permit,
    AccessControl,
    ERC20Fee,
    RandomDEXErrors
{
    /**
     * @dev Role required to mint new tokens.
     */
    bytes32 public constant MINT_ROLE = keccak256("MINT_ROLE");

    /**
     * @dev Role required to burn tokens.
     */
    bytes32 public constant BURN_ROLE = keccak256("BURN_ROLE");

    /**
     * @dev Role for addresses allowed to transfer before listing.
     */
    bytes32 public constant ALLOWED_TRANSFER_FROM_ROLE = keccak256("ALLOWED_TRANSFER_FROM_ROLE");

    /**
     * @dev Instance of the Uniswap V2 Router.
     */
    IUniswapV2Router02 public immutable uniswapRouter;

    /**
     * @dev Address of the WETH token.
     */
    address public immutable WETH;

    /**
     * @dev Address of the Uniswap V2 Router contract.
     */
    address public immutable UNISWAP_V2_ROUTER;

    /**
     * @dev Timestamp after which all transfers are allowed.
     */
    uint256 public listingTimestamp;
    
    /**
     * @dev Slippage tolerance for swaps (in basis points, 100 = 1%).
     */
    uint256 public slippageTolerance = 100;
    
    /**
     * @dev Emitted when new tokens are minted.
     */
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Emitted when tokens are burned.
     */
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Emitted when a fee is collected.
     */
    event FeeCharged(address indexed from, address indexed to, uint256 fee);

    /**
     * @dev Emitted when RDX fees are swapped for ETH.
     */
    event FeeSwappedToETH(
        uint256 rdxAmount,
        uint256 ethAmountExpected,
        address receiver
    );

    /**
     * @dev Emitted when a token transfer is completed.
     */
    event TransferCompleted(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    /**
     * @dev Emitted when RDX fees are claimed in RDX.
     */
    event FeeClaimedInRDX(uint256 rdxAmount, address receiver);

    /**
     * @dev Emitted when RDX fees are claimed in ETH.
     */
    event FeeClaimedInETH(uint256 ethAmountExpected, address receiver);
    
    /**
     * @dev Emitted when slippage tolerance is updated.
     */
    event SlippageToleranceUpdated(uint256 newSlippageTolerance);
    
    /**
     * @dev Emitted when listing timestamp is updated.
     */
    event ListingTimestampUpdated(uint256 timestamp);

    /**
     * @dev Token contract state initialization.
     * @param defaultAdmin_ The default admin address.
     * @param feeCollector_ The fee collector address.
     * @param feeMaximumNumerator_ The maximum fee numerator.
     * @param feeDenominator_ The common denominator for all fees.
     * @param fees_ The fee transfer numerators.
     * @param antiBotFees_ The antibot fee transfer numerators.
     * @param antibotEndTimestamp_ The antibot ends timestamp.
     * @param uniswapRouter_ Uniswap Router Address.
     * @param listingTimestamp_ The listing timestamp.
     */
    constructor(
        address defaultAdmin_,
        address feeCollector_,
        uint16 feeMaximumNumerator_,
        uint16 feeDenominator_,
        Fees memory fees_,
        Fees memory antiBotFees_,
        uint256 antibotEndTimestamp_,
        address uniswapRouter_,
        uint256 listingTimestamp_
    )
        ERC20("RandomDEX", "RDX")
        ERC20Permit("RandomDEX")
        ERC20Fee(
            defaultAdmin_,
            feeCollector_,
            feeMaximumNumerator_,
            feeDenominator_,
            fees_,
            antiBotFees_,
            antibotEndTimestamp_
        )
    {
        if (defaultAdmin_ == address(0)) revert InvalidAddress();
        if (feeCollector_ == address(0)) revert InvalidAddress();
        if (uniswapRouter_ == address(0)) revert InvalidAddress();

        UNISWAP_V2_ROUTER = uniswapRouter_;
        uniswapRouter = IUniswapV2Router02(UNISWAP_V2_ROUTER);
        WETH = uniswapRouter.WETH();
        listingTimestamp = listingTimestamp_;

        _grantRole(DEFAULT_ADMIN_ROLE, address(this)); 
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin_);
        emit ListingTimestampUpdated(listingTimestamp_);

    }
    /**
     * @dev Sets the timestamp after which all transfers are allowed.
     * Can only be called by admin and only if token is not yet listed.
     * @param timestamp The new listing timestamp.
     */
    function setListingTimestamp(
        uint256 timestamp
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Once the token is listed, the timestamp cannot be changed
        if (listingTimestamp > 0 && block.timestamp >= listingTimestamp) {
            revert TokenAlreadyListed();
        }

        listingTimestamp = timestamp;
        emit ListingTimestampUpdated(timestamp);
    }
    /**
     * @dev Updates the slippage tolerance for swaps.
     * @param _slippageTolerance New slippage tolerance (in basis points, 100 = 1%)
     */
    function updateSlippageTolerance(uint256 _slippageTolerance) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_slippageTolerance > 5000) revert SlippageToleranceTooHigh();
        slippageTolerance = _slippageTolerance;
        emit SlippageToleranceUpdated(_slippageTolerance);
    }

    /**
     * @dev Mints new tokens to a specified address. Restricted to MINT_ROLE holders.
     * @param to The recipient address.
     * @param amount The number of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyRole(MINT_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidTokenAmount();
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burns tokens from a specified address. Restricted to BURN_ROLE holders.
     * @param from The address to burn tokens from.
     * @param amount The number of tokens to burn.
     */
    function burn(address from, uint256 amount) external onlyRole(BURN_ROLE) {
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidTokenAmount();

        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @dev Allows the admin to claim RDX fees in ETH.
     *      Restricted to DEFAULT_ADMIN_ROLE holders.
     */
    function claimFeeInEth() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 rdxBalance = balanceOf(address(this));
        if (rdxBalance == 0) revert InsufficientClaimAmount();

        uint256 ethAmountExpected = _swapRDXForETH(rdxBalance);
        emit FeeClaimedInETH(ethAmountExpected, feeCollector);
    }

    /**
     * @dev Allows the admin to claim RDX fees.
     *      Restricted to DEFAULT_ADMIN_ROLE holders.
     */
    function claimFeeInRDX() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 rdxBalance = balanceOf(address(this));
        if (rdxBalance == 0) revert InsufficientClaimAmount();
        super._transfer(address(this), feeCollector, rdxBalance);
        emit FeeClaimedInRDX(rdxBalance, feeCollector);
    }
    /**
     * @dev Retrieves the amount of RDX available for claiming in the contract.
     * @return The balance of RDX tokens in the contract.
     */
    function claimableFeeInRDX() public view returns (uint256) {
        return super.balanceOf(address(this));
    }

    /**
     * @dev Overrides the ERC-20 transferFrom function to add additional checks.
     *      Restricted to DEFAULT_ADMIN_ROLE holders.
     * @param sender The address of the sender.
     * @param recipient The address of the recipient.
     * @param amount The amount of tokens to transfer.
     * @return bool True if the transfer is successful.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
       if (block.timestamp < listingTimestamp) {
            // Check if sender is authorized
            bool isAuthorized = hasRole(ALLOWED_TRANSFER_FROM_ROLE, sender) || 
                                hasRole(ALLOWED_TRANSFER_FROM_ROLE, _msgSender()) || 
                                hasRole(DEFAULT_ADMIN_ROLE, sender) ||
                                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()); 
            // If NOT authorized, revert the transaction
            if (!isAuthorized) {
                revert SupervisedTransferRestricted();
            }
        }
        
        // If we get here, either we're past listing time or sender is authorized
        return super.transferFrom(sender, recipient, amount);
    }
    /**
     * @dev Handles token transfers, applies transfer fees when necessary, and stores fees in the contract.
     *      Overrides the ERC-20 `_update` function to integrate fee deductions.
     * @param from The sender address.
     * @param to The recipient address.
     * @param amount The amount of tokens to transfer.
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Allow minting and burning operations to bypass restrictions
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            emit TransferCompleted(from, to, amount);
            return;
        }

        (uint256 fee, uint256 rest) = super._computeFee(_msgSender(), from, to, amount);
        if (fee > 0) {
            // Collect fee in RDX and store in contract
            super._transfer(from, address(this), fee);
        }
        super._update(from, to, rest);
        emit TransferCompleted(from, to, rest);
    }


    /**
     * @dev Swaps RDX tokens for ETH using Uniswap and sends the ETH to the fee collector.
     *      Ensures that ETH is successfully received before completing the transaction.
     * @param rdxAmount The amount of RDX tokens to swap.
     * @return ethAmountExpected The amount of ETH expected from the swap.
     */
    function _swapRDXForETH(
        uint256 rdxAmount
    ) internal returns (uint256 ethAmountExpected) {
        if (rdxAmount == 0) revert InsufficientSwapAmount();

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = WETH;
        _approve(address(this), UNISWAP_V2_ROUTER, rdxAmount);

        ethAmountExpected = uniswapRouter.getAmountsOut(rdxAmount, path)[1];
        if (ethAmountExpected == 0) revert SwapFailed();
        
        // Calculate minimum ETH amount based on slippage tolerance (using 10000 as denominator)
        uint256 minEthAmount = ethAmountExpected * (10000 - slippageTolerance) / 10000;
        uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            rdxAmount,
            minEthAmount,
            path,
            feeCollector,
            block.timestamp + 300
        );
        emit FeeSwappedToETH(rdxAmount, ethAmountExpected, feeCollector);
    }
}