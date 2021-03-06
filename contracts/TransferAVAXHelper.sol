// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// helper methods for interacting with ERC20 tokens and sending ETH that do not consistently return true/false
library TransferAVAXHelper {
    function safeTransferAVAX(address _to, uint256 _value) internal {
        (bool success,) = _to.call{value:_value}(new bytes(0));
        require(success, 'TH AVAX_TRANSFER_FAILED');
    }
}
