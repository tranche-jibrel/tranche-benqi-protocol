// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAVAXGateway {
  function withdrawAVAX(uint256 amount, address onBehalfOf, bool redeemType, uint256 _cEthBal) external;
}
