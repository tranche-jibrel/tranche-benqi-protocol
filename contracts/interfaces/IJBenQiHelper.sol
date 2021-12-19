// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IJBenQiHelper {
    // function sendErc20ToCompoundHelper(address _underToken, address _cToken, uint256 _numTokensToSupply) external returns(uint256);
    // function redeemQiErc20TokensHelper(address _cToken, uint256 _amount, bool _redeemType) external returns (uint256 redeemResult);

    function getMantissaHelper(uint256 _underDecs, uint256 _cTokenDecs) external pure returns (uint256 mantissa);
    function getBenQiPurePriceHelper(address _cTokenAddress) external view returns (uint256 compoundPrice);
    function getBenQiPriceHelper(address _cTokenAddress, uint256 _underDecs, uint256 _cTokenDecs) external view returns (uint256 compNormPrice);
}