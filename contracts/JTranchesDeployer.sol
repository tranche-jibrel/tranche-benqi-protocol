// SPDX-License-Identifier: MIT
/**
 * Created on 2021-02-11
 * @summary: Jibrel Compound Tranche Deployer
 * @author: Jibrel Team
 */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./interfaces/IJTranchesDeployer.sol";
import "./interfaces/IJAdminTools.sol";
import "./JTrancheAToken.sol";
import "./JTrancheBToken.sol";
import "./JTranchesDeployerStorage.sol";


contract JTranchesDeployer is OwnableUpgradeable, JTranchesDeployerStorage, IJTranchesDeployer {
    using SafeMathUpgradeable for uint256;

    function initialize() external initializer() {
        OwnableUpgradeable.__Ownable_init();
    }

    function setBenQiAddresses(address _jBenQi, address _jATAddress) external onlyOwner {
        jBenQiAddress = _jBenQi;
        jAdminToolsAddress = _jATAddress;
    }

    modifier onlyProtocol() {
        require(msg.sender == jBenQiAddress, "TrancheDeployer: caller is not jCompound");
        _;
    }

    function deployNewTrancheATokens(string memory _nameA, 
            string memory _symbolA, 
            uint256 _trNum) external override onlyProtocol returns (address) {
        JTrancheAToken jTrancheA = new JTrancheAToken(_nameA, _symbolA, _trNum);
        jTrancheA.setJBenQiMinter(msg.sender); 
        // add tranche address to admins!
        IJAdminTools(jAdminToolsAddress).addAdmin(address(jTrancheA));
        return address(jTrancheA);
    }

    function deployNewTrancheBTokens(string memory _nameB, 
            string memory _symbolB, 
            uint256 _trNum) external override onlyProtocol returns (address) {
        JTrancheBToken jTrancheB = new JTrancheBToken(_nameB, _symbolB, _trNum);
        jTrancheB.setJBenQiMinter(msg.sender);
        // add tranche address to admins!
        IJAdminTools(jAdminToolsAddress).addAdmin(address(jTrancheB));
        return address(jTrancheB);
    }

    function setNewJBenQiTokens(address _newJBenQi, address _trAToken, address _trBToken) external onlyOwner {
        require((_newJBenQi != address(0)) && (_trAToken != address(0)) && (_trBToken != address(0)), "TrancheDeployer: some address is not allowed");
        JTrancheAToken(_trAToken).setJBenQiMinter(_newJBenQi);
        JTrancheAToken(_trBToken).setJBenQiMinter(_newJBenQi);
    }

}