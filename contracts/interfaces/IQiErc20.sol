// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IQiErc20 {
    function mint(uint256) external returns (uint256);
    // function exchangeRateCurrent() external returns (uint256);
    function supplyRatePerTimestamp() external view returns (uint256);
    function redeem(uint) external returns (uint);
    function redeemUnderlying(uint) external returns (uint);
    function exchangeRateStored() external view returns (uint);
    function setExchangeRateStored(uint256 rate) external;
}