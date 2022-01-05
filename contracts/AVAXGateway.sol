// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import './interfaces/IAVAXGateway.sol';
import "./TransferAVAXHelper.sol";
import "./interfaces/IQiAvax.sol";

contract AVAXGateway is IAVAXGateway, Ownable, ReentrancyGuard {
  using SafeMath for uint256;

  IQiAvax internal immutable qiAVAXToken;
  address public jBenQiAddress;

  /**
   * @dev Sets the WAVAX address and the JBenQi address. Infinite approves JBenQi contract.
   * @param _qiAVAX Address of the Wrapped AVAX contract
   * @param _jBenQiAddress Address of the JBenQi contract
   **/
  constructor(address _qiAVAX, address _jBenQiAddress) {
    qiAVAXToken = IQiAvax(_qiAVAX);
    jBenQiAddress = _jBenQiAddress;
  }

  /**
   * @dev set JAave contract address 
   **/
  function setJBenQiAddress(address _jBenQiAddress) external onlyOwner {
    require(_jBenQiAddress != address(0), "WETHGateway: address not allowed");
    jBenQiAddress = _jBenQiAddress;
  }

  /**
  * @dev redeem qiAVAX from BenQi contract (AVAX remains in this contract)
  * @param _amount amount of qiAVAX to redeem
  * @param _redeemType true or false, normally true
  */
  function redeemQiAVAX(uint256 _amount, bool _redeemType) internal returns (uint256 redeemResult) {
      // _amount is scaled up by 1e18 to avoid decimals
      if (_redeemType) {
          // Retrieve your asset based on a cToken amount
          redeemResult = qiAVAXToken.redeem(_amount);
      } else {
          // Retrieve your asset based on an amount of the asset
          redeemResult = qiAVAXToken.redeemUnderlying(_amount);
      }
      return redeemResult;
  }

  /**
  * @dev get AVAX balance on this contract
  */
  function getAVAXBalance() public view returns (uint256) {
      return address(this).balance;
  }

  /**
  * @dev get Token balance on this contract
  */
  function getTokenBalance(address _token) public view returns (uint256) {
      return IERC20(_token).balanceOf(address(this));
  }

  /**
   * @dev withdraws the AVAX from QiAvax tokens.
   * @param _amount amount of qiAVAX to withdraw and receive native AVAX
   * @param _to address of the user who will receive native AVAX
   * @param _redeemType redeem type
   * @param _qiAVAXBal qiAVAX balance
   */
  function withdrawAVAX(uint256 _amount, address _to, bool _redeemType, uint256 _qiAVAXBal) external override nonReentrant {
    require(msg.sender == jBenQiAddress, "AVAXGateway: caller is not JBenQi contract");

    uint256 oldAVAXBal = getAVAXBalance();
    uint256 retCode = redeemQiAVAX(_amount, _redeemType);
    if(retCode != 0) { 
      // emergency: sennd all qiAVAX to BenQi
      retCode = redeemQiAVAX(_qiAVAXBal, true); 
    }
    uint256 diffAVAXBal = getAVAXBalance().sub(oldAVAXBal);
    if (diffAVAXBal > 0) {
      TransferAVAXHelper.safeTransferAVAX(_to, diffAVAXBal);
    }
    uint256 newQiAVAXBal = getTokenBalance(address(qiAVAXToken));
    if (newQiAVAXBal > 0)
       SafeERC20.safeTransfer(IERC20(address(qiAVAXToken)), _to, newQiAVAXBal);
  }

  /**
   * @dev transfer ERC20 from the utility contract, for ERC20 recovery in case of stuck tokens due
   * direct transfers to the contract address.
   * @param _token token to transfer
   * @param _to recipient of the transfer
   * @param _amount amount to send
   */
  function emergencyTokenTransfer(address _token, address _to, uint256 _amount) external onlyOwner {
    IERC20(_token).transfer(_to, _amount);
  }

  /**
   * @dev transfer native AVAX from the utility contract, for native AVAX recovery in case of stuck AVAX
   * due selfdestructs or transfer AVAX to pre-computated contract address before deployment.
   * @param _to recipient of the transfer
   * @param _amount amount to send
   */
  function emergencyAVAXTransfer(address _to, uint256 _amount) external onlyOwner {
    TransferAVAXHelper.safeTransferAVAX(_to, _amount);
  }

  /**
   * @dev Only QiAvax contract is allowed to transfer AVAX here. Prevent other addresses to send AVAX to this contract.
   */
  receive() external payable {
    require(msg.sender == address(qiAVAXToken), 'Receive not allowed');
  }

  /**
   * @dev Revert fallback calls
   */
  fallback() external payable {
    revert('Fallback not allowed');
  }
}
