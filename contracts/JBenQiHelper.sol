// SPDX-License-Identifier: MIT
/**
 * Created on 2021-08-27
 * @summary: Jibrel Compound Tranche Protocol Helper
 * @author: Jibrel Team
 */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "./interfaces/IQiErc20.sol";
import "./interfaces/IJBenQiHelper.sol";


contract JBenQiHelper is OwnableUpgradeable, IJBenQiHelper {
    using SafeMathUpgradeable for uint256;

    // address public jCompoundAddress;

    function initialize (/*address _jCompAddr*/) public initializer {
        OwnableUpgradeable.__Ownable_init();
        // jCompoundAddress = _jCompAddr;
    }
/*
    /**
     * @dev modifiers
     */
/*    modifier onlyJCompound() {
        require(msg.sender == jCompoundAddress, "!JCompound");
        _;
    }

    /**
     * @dev send an amount of tokens to corresponding compound contract (it takes tokens from this contract). Only allowed token should be sent
     * @param _underToken underlying token contract address
     * @param _qiToken qiToken contract address
     * @param _numTokensToSupply token amount to be sent
     * @return mint result
     */
/*    function sendErc20ToCompoundHelper(address _underToken, 
            address _qiToken, 
            uint256 _numTokensToSupply) public override onlyJCompound returns(uint256) {
        require(_qiToken != address(0), "!Accept");
        // i.e. DAI contract, on Kovan: 0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa
        IERC20Upgradeable underlying = IERC20Upgradeable(_underToken);

        // i.e. cDAI contract, on Kovan: 0xf0d0eb522cfa50b716b3b1604c4f0fa6f04376ad
        IQiErc20 qiToken = IQiErc20(_qiToken);

        SafeERC20Upgradeable.safeApprove(underlying, _qiToken, _numTokensToSupply);
        require(underlying.allowance(jCompoundAddress, _qiToken) >= _numTokensToSupply, "!AllowqiToken");

        uint256 mintResult = qiToken.mint(_numTokensToSupply);
        return mintResult;
    }

    /**
     * @dev redeem an amount of qiTokens to have back original tokens (tokens remains in this contract). Only allowed token should be sent
     * @param _qiToken qiToken contract address
     * @param _amount qiToken amount to be sent
     * @param _redeemType true or false, normally true
     */
/*    function redeemQiErc20TokensHelper(address _qiToken, 
            uint256 _amount, 
            bool _redeemType) public override onlyJCompound returns (uint256 redeemResult) {
        require(_qiToken != address(0),  "!Accept");
        // i.e. cDAI contract, on Kovan: 0xf0d0eb522cfa50b716b3b1604c4f0fa6f04376ad
        IQiErc20 qiToken = IQiErc20(_qiToken);

        if (_redeemType) {
            // Retrieve your asset based on a qiToken amount
            redeemResult = qiToken.redeem(_amount);
        } else {
            // Retrieve your asset based on an amount of the asset
            redeemResult = qiToken.redeemUnderlying(_amount);
        }
        return redeemResult;
    }
*/
    /**
     * @dev get qiToken stored exchange rate from compound contract
     * @param _qiTokenAddress qiToken address
     * @return exchRateMantissa exchange rate qiToken mantissa
     */
    function getQiTokenExchangeRate(address _qiTokenAddress) public view returns (uint256 exchRateMantissa) {
        // Amount of current exchange rate from qiToken to underlying
        return exchRateMantissa = IQiErc20(_qiTokenAddress).exchangeRateStored(); // it returns something like 210615675702828777787378059 (cDAI contract) or 209424757650257 (cUSDT contract)
    }

    /**
     * @dev get compound mantissa
     * @param _underDecs underlying decimals
     * @param _qiTokenDecs qiToken decimals
     * @return mantissa tranche mantissa (from 16 to 28 decimals)
     */
    function getMantissaHelper(uint256 _underDecs, uint256 _qiTokenDecs) public pure override returns (uint256 mantissa) {
        mantissa = (uint256(_underDecs)).add(18).sub(uint256(_qiTokenDecs));
        return mantissa;
    }

    /**
     * @dev get compound pure price for a single tranche
     * @param _qiTokenAddress qiToken address
     * @return purePrice protocol current pure price
     */
    function getBenQiPurePriceHelper(address _qiTokenAddress) public view override returns (uint256 purePrice) {
        purePrice = getQiTokenExchangeRate(_qiTokenAddress);
        return purePrice;
    }

     /**
     * @dev get compound price for a single tranche scaled by 1e18
     * @param _qiTokenAddress qiToken address
     * @param _underDecs underlying decimals
     * @param _qiTokenDecs qiToken decimalsr
     * @return normPrice compound current normalized price
     */
    function getBenQiPriceHelper(address _qiTokenAddress, uint256 _underDecs, uint256 _qiTokenDecs) public view override returns (uint256 normPrice) {
        normPrice = getBenQiPurePriceHelper(_qiTokenAddress);

        uint256 mantissa = getMantissaHelper(_underDecs, _qiTokenDecs);
        if (mantissa < 18) {
            normPrice = normPrice.mul(10 ** (uint256(18).sub(mantissa)));
        } else {
            normPrice = normPrice.div(10 ** (mantissa.sub(uint256(18))));
        }
        return normPrice;
    }
}