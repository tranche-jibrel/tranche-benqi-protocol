// SPDX-License-Identifier: MIT
/**
 * Created on 2021-12-15
 * @summary: Jibrel BenQi Tranche Protocol
 * @author: Jibrel Team
 */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IJAdminTools.sol";
import "./interfaces/IJTrancheTokens.sol";
import "./interfaces/IJTranchesDeployer.sol";
import "./interfaces/IJBenQi.sol";
import "./interfaces/IQiErc20.sol";
import "./interfaces/IComptrollerLensInterface.sol";
import "./JBenQiStorage.sol";
import "./TransferAVAXHelper.sol";


contract JBenQi is OwnableUpgradeable, ReentrancyGuardUpgradeable, JBenQiStorageV2, IJBenQi {
    using SafeMathUpgradeable for uint256;

    /**
     * @dev contract initializer
     * @param _adminTools price oracle address
     * @param _feesCollector fees collector contract address
     * @param _tranchesDepl tranches deployer contract address
     * @param _qiTokenAddress COMP token contract address
     * @param _comptrollAddress comptroller contract address
     */
    function initialize(address _adminTools, 
            address _feesCollector, 
            address _tranchesDepl,
            address _qiTokenAddress,
            address _comptrollAddress) external initializer() {
        OwnableUpgradeable.__Ownable_init();
        adminToolsAddress = _adminTools;
        feesCollectorAddress = _feesCollector;
        tranchesDeployerAddress = _tranchesDepl;
        qiTokenAddress = _qiTokenAddress;
        trollerAddress = _comptrollAddress;
        redeemTimeout = 3; //default
        // totalBlocksPerYear = 2102400; // same number like in BenQi protocol
        totalBlocksPerYear = 31557600; // secondonds in 1 year
    }

    /**
     * @dev admins modifiers
     */
    modifier onlyAdmins() {
        require(IJAdminTools(adminToolsAddress).isAdmin(msg.sender), "!Admin");
        _;
    }

    // This is needed to receive ETH
    fallback() external payable {}
    receive() external payable {}

    /**
     * @dev set constants for JBenQi
     * @param _trNum tranche number
     * @param _redemPerc redemption percentage (scaled by 1e4)
     * @param _redemTimeout redemption timeout, in blocks
     * @param _blocksPerYear blocks per year (31.557.600 seconds in 1 year)
     */
    function setConstantsValues(uint256 _trNum, uint16 _redemPerc, uint32 _redemTimeout, uint256 _blocksPerYear) external onlyAdmins {
        trancheParameters[_trNum].redemptionPercentage = _redemPerc;
        redeemTimeout = _redemTimeout;
        totalBlocksPerYear = _blocksPerYear;
    }

    /**
     * @dev set eth gateway 
     * @param _avaxGateway avaxGateway address
     */
    function setAVAXGateway(address _avaxGateway) external onlyAdmins {
        avaxGateway = IAVAXGateway(_avaxGateway);
    }

    /**
     * @dev set new addresses for price oracle, fees collector and tranche deployer 
     * @param _adminTools price oracle address
     * @param _feesCollector fees collector contract address
     * @param _tranchesDepl tranches deployer contract address
     * @param _qiTokenAddress COMP token contract address
     * @param _comptrollAddress comptroller contract address
     */
    function setNewEnvironment(address _adminTools, 
            address _feesCollector, 
            address _tranchesDepl,
            address _qiTokenAddress,
            address _comptrollAddress) external onlyOwner {
        require((_adminTools != address(0)) && (_feesCollector != address(0)) && 
            (_tranchesDepl != address(0)) && (_comptrollAddress != address(0)) && (_qiTokenAddress != address(0)), "ChkAddress");
        adminToolsAddress = _adminTools;
        feesCollectorAddress = _feesCollector;
        tranchesDeployerAddress = _tranchesDepl;
        qiTokenAddress = _qiTokenAddress;
        trollerAddress = _comptrollAddress;
    }

    /**
     * @dev set relationship between AVAX and the corresponding BenQi qiAVAX contract
     * @param _QiAvaxContract BenQi token contract address
     */
    function setQiAvaxContract(address _QiAvaxContract) external onlyAdmins {
        qiAVAXToken = IQiAvax(_QiAvaxContract);
        qiTokenContracts[address(0)] = _QiAvaxContract;
    }

    /**
     * @dev set relationship between a token and the corresponding BenQi qiToken contract
     * @param _erc20Contract token contract address 
     * @param _QiErc20Contract BenQi token contract address 
     */
    function setQiTokenContract(address _erc20Contract, address _QiErc20Contract) external onlyAdmins {
        qiTokenContracts[_erc20Contract] = _QiErc20Contract;
    }

    /**
     * @dev check if a qiToken is allowed or not
     * @param _erc20Contract token contract address (i.e. DAI contract, on Kovan: 0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa)
     * @return true or false
     */
    function isQiTokenAllowed(address _erc20Contract) public view returns (bool) {
        return qiTokenContracts[_erc20Contract] != address(0);
    }

    /**
     * @dev get RPB from compound
     * @param _trancheNum tranche number
     * @return qiToken compound supply RPB
     */
    function getCompoundSupplyRPB(uint256 _trancheNum) external view returns (uint256) {
        IQiErc20 qiToken = IQiErc20(qiTokenContracts[trancheAddresses[_trancheNum].buyerCoinAddress]);
        return qiToken.supplyRatePerTimestamp();
    }

    /**
     * @dev set decimals for tranche tokens
     * @param _trancheNum tranche number
     * @param _qiTokenDec qiToken decimals
     * @param _underlyingDec underlying token decimals
     */
    function setDecimals(uint256 _trancheNum, uint8 _qiTokenDec, uint8 _underlyingDec) external onlyAdmins {
        require((_qiTokenDec <= 18) && (_underlyingDec <= 18), "Decs");
        trancheParameters[_trancheNum].qiTokenDecimals = _qiTokenDec;
        trancheParameters[_trancheNum].underlyingDecimals = _underlyingDec;
    }

    /**
     * @dev set tranche A fixed percentage (scaled by 1e18)
     * @param _trancheNum tranche number
     * @param _newTrAPercentage new tranche A fixed percentage (scaled by 1e18)
     */
    function setTrancheAFixedPercentage(uint256 _trancheNum, uint256 _newTrAPercentage) external onlyAdmins {
        trancheParameters[_trancheNum].trancheAFixedPercentage = _newTrAPercentage;
        trancheParameters[_trancheNum].storedTrancheAPrice = setTrancheAExchangeRate(_trancheNum);
    }

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
    function getMantissa(uint256 _underDecs, uint256 _qiTokenDecs) public pure returns (uint256 mantissa) {
        mantissa = (uint256(_underDecs)).add(18).sub(uint256(_qiTokenDecs));
        return mantissa;
    }

    /**
     * @dev get compound pure price for a single tranche
     * @param _qiTokenAddress qiToken address
     * @return purePrice protocol current pure price
     */
    function getBenQiPurePrice(address _qiTokenAddress) public view returns (uint256 purePrice) {
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
    function getBenQiPrice(address _qiTokenAddress, uint256 _underDecs, uint256 _qiTokenDecs) public view returns (uint256 normPrice) {
        normPrice = getBenQiPurePrice(_qiTokenAddress);

        uint256 mantissa = getMantissa(_underDecs, _qiTokenDecs);
        if (mantissa < 18) {
            normPrice = normPrice.mul(10 ** (uint256(18).sub(mantissa)));
        } else {
            normPrice = normPrice.div(10 ** (mantissa.sub(uint256(18))));
        }
        return normPrice;
    }

    /**
     * @dev add tranche in protocol
     * @param _erc20Contract token contract address (0x0000000000000000000000000000000000000000 if eth)
     * @param _nameA tranche A token name
     * @param _symbolA tranche A token symbol
     * @param _nameB tranche B token name
     * @param _symbolB tranche B token symbol
     * @param _fixPercentage tranche A percentage fixed compounded interest per year
     * @param _qiTokenDec qiToken decimals
     * @param _underlyingDec underlying token decimals
     */
    function addTrancheToProtocol(address _erc20Contract, string memory _nameA, string memory _symbolA, string memory _nameB, 
                string memory _symbolB, uint256 _fixPercentage, uint8 _qiTokenDec, uint8 _underlyingDec) external onlyAdmins nonReentrant {
        require(tranchesDeployerAddress != address(0), "!TrDepl");
        require(isQiTokenAllowed(_erc20Contract), "!Allow");

        trancheAddresses[tranchePairsCounter].buyerCoinAddress = _erc20Contract;
        trancheAddresses[tranchePairsCounter].qiTokenAddress = qiTokenContracts[_erc20Contract];
        // our tokens always with 18 decimals
        trancheAddresses[tranchePairsCounter].ATrancheAddress = 
                IJTranchesDeployer(tranchesDeployerAddress).deployNewTrancheATokens(_nameA, _symbolA, tranchePairsCounter);
        trancheAddresses[tranchePairsCounter].BTrancheAddress = 
                IJTranchesDeployer(tranchesDeployerAddress).deployNewTrancheBTokens(_nameB, _symbolB, tranchePairsCounter);
        
        trancheParameters[tranchePairsCounter].qiTokenDecimals = _qiTokenDec;
        trancheParameters[tranchePairsCounter].underlyingDecimals = _underlyingDec;
        trancheParameters[tranchePairsCounter].trancheAFixedPercentage = _fixPercentage;
        trancheParameters[tranchePairsCounter].trancheALastActionBlock = block.timestamp;
        // if we would like to have always 18 decimals
        trancheParameters[tranchePairsCounter].storedTrancheAPrice = getBenQiPrice(qiTokenContracts[_erc20Contract], _underlyingDec, _qiTokenDec);

        trancheParameters[tranchePairsCounter].redemptionPercentage = 10000;  //default value 99.9%

        calcRPBFromPercentage(tranchePairsCounter); // initialize tranche A RPB

        emit TrancheAddedToProtocol(tranchePairsCounter, trancheAddresses[tranchePairsCounter].ATrancheAddress, trancheAddresses[tranchePairsCounter].BTrancheAddress);

        tranchePairsCounter = tranchePairsCounter.add(1);
    } 

    /**
     * @dev enables or disables tranche deposit (default: disabled)
     * @param _trancheNum tranche number
     * @param _enable true or false
     */
    function setTrancheDeposit(uint256 _trancheNum, bool _enable) external onlyAdmins {
        trancheDepositEnabled[_trancheNum] = _enable;
    }

    /**
     * @dev send an amount of tokens to corresponding compound contract (it takes tokens from this contract). Only allowed token should be sent
     * @param _erc20Contract token contract address
     * @param _numTokensToSupply token amount to be sent
     * @return mint result
     */
    function sendErc20ToCompound(address _erc20Contract, uint256 _numTokensToSupply) internal returns(uint256) {
        address qiTokenAddress = qiTokenContracts[_erc20Contract];
        require(qiTokenAddress != address(0), "!Accept");

        IERC20Upgradeable underlying = IERC20Upgradeable(_erc20Contract);

        IQiErc20 qiToken = IQiErc20(qiTokenAddress);

        SafeERC20Upgradeable.safeApprove(underlying, qiTokenAddress, _numTokensToSupply);
        require(underlying.allowance(address(this), qiTokenAddress) >= _numTokensToSupply, "!AllowQiToken");

        uint256 mintResult = qiToken.mint(_numTokensToSupply);
        return mintResult;
    }

    /**
     * @dev redeem an amount of qiTokens to have back original tokens (tokens remains in this contract). Only allowed token should be sent
     * @param _erc20Contract original token contract address
     * @param _amount qiToken amount to be sent
     * @param _redeemType true or false, normally true
     */
    function redeemQiErc20Tokens(address _erc20Contract, uint256 _amount, bool _redeemType) internal returns (uint256 redeemResult) {
        address qiTokenAddress = qiTokenContracts[_erc20Contract];
        require(qiTokenAddress != address(0),  "!Accept");

        IQiErc20 qiToken = IQiErc20(qiTokenAddress);

        if (_redeemType) {
            // Retrieve your asset based on a qiToken amount
            redeemResult = qiToken.redeem(_amount);
        } else {
            // Retrieve your asset based on an amount of the asset
            redeemResult = qiToken.redeemUnderlying(_amount);
        }
        return redeemResult;
    }

    /**
     * @dev get Tranche A exchange rate
     * @param _trancheNum tranche number
     * @return tranche A token stored price
     */
    function getTrancheAExchangeRate(uint256 _trancheNum) public view override returns (uint256) {
        return trancheParameters[_trancheNum].storedTrancheAPrice;
    }

    /**
     * @dev get RPB for a given percentage (expressed in 1e18)
     * @param _trancheNum tranche number
     * @return RPB for a fixed percentage
     */
    function getTrancheACurrentRPB(uint256 _trancheNum) external view override returns (uint256) {
        return trancheParameters[_trancheNum].trancheACurrentRPB;
    }

    /**
     * @dev set Tranche A exchange rate
     * @param _trancheNum tranche number
     * @return tranche A token stored price
     */
    function setTrancheAExchangeRate(uint256 _trancheNum) internal returns (uint256) {
        calcRPBFromPercentage(_trancheNum);
        // uint256 deltaBlocks = (block.number).sub(trancheParameters[_trancheNum].trancheALastActionBlock);
        uint256 deltaTime = (block.timestamp).sub(trancheParameters[_trancheNum].trancheALastActionBlock);
        if (deltaTime > 0) {
            // uint256 deltaPrice = (trancheParameters[_trancheNum].trancheACurrentRPB).mul(deltaBlocks);
            uint256 deltaPrice = (trancheParameters[_trancheNum].trancheACurrentRPB).mul(deltaTime);
            trancheParameters[_trancheNum].storedTrancheAPrice = (trancheParameters[_trancheNum].storedTrancheAPrice).add(deltaPrice);
            // trancheParameters[_trancheNum].trancheALastActionBlock = block.number;
            trancheParameters[_trancheNum].trancheALastActionBlock = block.timestamp;
        }
        return trancheParameters[_trancheNum].storedTrancheAPrice;
    }

    /**
     * @dev get Tranche A RPB for percentage (scaled by 18 decimals)
     * @param _trancheNum tranche number
     * @return tranche A token current price
     */
    function calcRPBFromPercentage(uint256 _trancheNum) public returns (uint256) {
        trancheParameters[_trancheNum].trancheACurrentRPB = (trancheParameters[_trancheNum].trancheAFixedPercentage).div(totalBlocksPerYear).div(1e18);
        return trancheParameters[_trancheNum].trancheACurrentRPB;
    }

    /**
     * @dev get Tranche A value in underlying tokens
     * @param _trancheNum tranche number
     * @return trANormValue tranche A value in underlying tokens
     */
    function getTrAValue(uint256 _trancheNum) public view override returns (uint256 trANormValue) {
        uint256 totASupply = IERC20Upgradeable(trancheAddresses[_trancheNum].ATrancheAddress).totalSupply();
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        uint256 storedAPrice = trancheParameters[_trancheNum].storedTrancheAPrice;
        trANormValue = totASupply.mul(storedAPrice).div(1e18).div(10 ** diffDec);
        return trANormValue;
    }

    /**
     * @dev get Tranche B value in underlying tokens
     * @param _trancheNum tranche number
     * @return tranche B valuein underlying tokens
     */
    function getTrBValue(uint256 _trancheNum) external view override returns (uint256) {
        uint256 totProtValue = getTotalValue(_trancheNum);
        uint256 totTrAValue = getTrAValue(_trancheNum);
        if (totProtValue > totTrAValue) {
            return totProtValue.sub(totTrAValue);
        } else
            return 0;
    }

    /**
     * @dev get Tranche total value in underlying tokens
     * @param _trancheNum tranche number
     * @return tranche total value in underlying tokens
     */
    function getTotalValue(uint256 _trancheNum) public view override returns (uint256) {
        address qiTokenAddress = trancheAddresses[_trancheNum].qiTokenAddress;
        uint256 underDecs = uint256(trancheParameters[_trancheNum].underlyingDecimals);
        uint256 qiTokenDecs = uint256(trancheParameters[_trancheNum].qiTokenDecimals);
        uint256 compNormPrice = getBenQiPrice(qiTokenAddress, underDecs, qiTokenDecs);
        uint256 mantissa = getMantissa(underDecs, qiTokenDecs);
        if (mantissa < 18) {
            compNormPrice = compNormPrice.div(10 ** (uint256(18).sub(mantissa)));
        } else {
            compNormPrice = getBenQiPurePrice(qiTokenAddress);
        }
        uint256 totProtSupply = getTokenBalance(trancheAddresses[_trancheNum].qiTokenAddress);
        return totProtSupply.mul(compNormPrice).div(1e18);
    }

    /**
     * @dev get Tranche B exchange rate
     * @param _trancheNum tranche number
     * @param _newAmount new amount entering tranche B (in underlying tokens)
     * @return tbPrice tranche B token current price
     */
    function getTrancheBExchangeRate(uint256 _trancheNum, uint256 _newAmount) public view override returns (uint256 tbPrice) {
        // set amount of tokens to be minted via taToken price
        // Current tbDai price = (((cDai X cPrice)-(aSupply X taPrice)) / bSupply)
        // where: cDai = How much cDai we hold in the protocol
        // cPrice = cDai / Dai price
        // aSupply = Total number of taDai in protocol
        // taPrice = taDai / Dai price
        // bSupply = Total number of tbDai in protocol
        uint256 totTrBValue;

        uint256 totBSupply = IERC20Upgradeable(trancheAddresses[_trancheNum].BTrancheAddress).totalSupply(); // 18 decimals
        // if normalized price in tranche A price, everything should be scaled to 1e18 
        uint256 underlyingDec = uint256(trancheParameters[_trancheNum].underlyingDecimals);
        uint256 normAmount = _newAmount;
        if (underlyingDec < 18)
            normAmount = _newAmount.mul(10 ** uint256(18).sub(underlyingDec));
        uint256 newBSupply = totBSupply.add(normAmount); // 18 decimals

        uint256 totProtValue = getTotalValue(_trancheNum).add(_newAmount); //underlying token decimals
        uint256 totTrAValue = getTrAValue(_trancheNum); //underlying token decimals
        if (totProtValue >= totTrAValue)
            totTrBValue = totProtValue.sub(totTrAValue); //underlying token decimals
        else
            totTrBValue = 0;
        // if normalized price in tranche A price, everything should be scaled to 1e18 
        if (underlyingDec < 18 && totTrBValue > 0) {
            totTrBValue = totTrBValue.mul(10 ** (uint256(18).sub(underlyingDec)));
        }
        if (totTrBValue > 0 && newBSupply > 0) {
            // if normalized price in tranche A price, everything should be scaled to 1e18 
            tbPrice = totTrBValue.mul(1e18).div(newBSupply);
        } else
            // if normalized price in tranche A price, everything should be scaled to 1e18 
            tbPrice = uint256(1e18);

        return tbPrice;
    }

    /**
     * @dev buy Tranche A Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function buyTrancheAToken(uint256 _trancheNum, uint256 _amount) external payable nonReentrant {
        require(trancheDepositEnabled[_trancheNum], "!Deposit");
        address qiTokenAddress = trancheAddresses[_trancheNum].qiTokenAddress;
        address underTokenAddress = trancheAddresses[_trancheNum].buyerCoinAddress;
        uint256 prevCompTokenBalance = getTokenBalance(qiTokenAddress);
        if (underTokenAddress == address(0)){
            require(msg.value == _amount, "!Amount");
            //Transfer ETH from msg.sender to protocol;
            TransferAVAXHelper.safeTransferAVAX(address(this), _amount);
            // transfer ETH to Coompound receiving qiAvax
            qiAVAXToken.mint{value: _amount}();
        } else {
            // check approve
            require(IERC20Upgradeable(underTokenAddress).allowance(msg.sender, address(this)) >= _amount, "!Allowance");
            //Transfer DAI from msg.sender to protocol;
            SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(underTokenAddress), msg.sender, address(this), _amount);
            // transfer DAI to Coompound receiving cDai
            sendErc20ToCompound(underTokenAddress, _amount);
        }
        uint256 newCompTokenBalance = getTokenBalance(qiTokenAddress);
        // set amount of tokens to be minted calculate taToken amount via taToken price
        setTrancheAExchangeRate(_trancheNum);
        uint256 taAmount;
        if (newCompTokenBalance > prevCompTokenBalance) {
            // if normalized price in tranche A price, everything should be scaled to 1e18 
            uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
            uint256 normAmount = _amount.mul(10 ** diffDec);
            taAmount = normAmount.mul(1e18).div(trancheParameters[_trancheNum].storedTrancheAPrice);

            IJTrancheTokens(trancheAddresses[_trancheNum].ATrancheAddress).mint(msg.sender, taAmount);
        } else {
            taAmount = 0;
        }

        lastActivity[msg.sender] = block.number;
        emit TrancheATokenMinted(_trancheNum, msg.sender, _amount, taAmount);
    }

    /**
     * @dev redeem Tranche A Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function redeemTrancheAToken(uint256 _trancheNum, uint256 _amount) external nonReentrant {
        require((block.number).sub(lastActivity[msg.sender]) >= redeemTimeout, "!Timeout");
        // check approve
        // address aTrancheAddress = trancheAddresses[_trancheNum].ATrancheAddress;
        require(IERC20Upgradeable(trancheAddresses[_trancheNum].ATrancheAddress).allowance(msg.sender, address(this)) >= _amount, "!Allowance");
        //Transfer DAI from msg.sender to protocol;
        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(trancheAddresses[_trancheNum].ATrancheAddress), msg.sender, address(this), _amount);

        uint256 oldBal;
        uint256 diffBal;
        uint256 userAmount;
        uint256 feesAmount;
        setTrancheAExchangeRate(_trancheNum);
        // if normalized price in tranche A price, everything should be scaled to 1e18 
        uint256 taAmount = _amount.mul(trancheParameters[_trancheNum].storedTrancheAPrice).div(1e18);
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        uint256 normAmount = taAmount.div(10 ** diffDec);

        address qiTokenAddress = trancheAddresses[_trancheNum].qiTokenAddress;
        uint256 qiTokenBal = getTokenBalance(qiTokenAddress); // needed for emergency
        address underTokenAddress = trancheAddresses[_trancheNum].buyerCoinAddress;
        uint256 redeemPerc = uint256(trancheParameters[_trancheNum].redemptionPercentage);
        if (underTokenAddress == address(0)) {
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(qiTokenAddress), address(avaxGateway), qiTokenBal);
            // calculate taAmount via qiAvax price
            oldBal = getEthBalance();
            avaxGateway.withdrawAVAX(normAmount, address(this), false, qiTokenBal);
            diffBal = getEthBalance().sub(oldBal);
            userAmount = diffBal.mul(redeemPerc).div(PERCENT_DIVIDER);
            TransferAVAXHelper.safeTransferAVAX(msg.sender, userAmount);
            if (diffBal > userAmount && feesAmount > 0) {
                feesAmount = diffBal.sub(userAmount);
                // transfer fees to JFeesCollector
                TransferAVAXHelper.safeTransferAVAX(feesCollectorAddress, feesAmount);
            }   
        } else {
            // calculate taAmount via qiToken price
            oldBal = getTokenBalance(underTokenAddress);
            uint256 retCode = redeemQiErc20Tokens(underTokenAddress, normAmount, false);
            if(retCode != 0) {
                // emergency: send all qiTokens balance to compound 
                redeemQiErc20Tokens(underTokenAddress, qiTokenBal, true); 
            }
            diffBal = getTokenBalance(underTokenAddress).sub(oldBal);
            userAmount = diffBal.mul(redeemPerc).div(PERCENT_DIVIDER);
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(underTokenAddress), msg.sender, userAmount);
            feesAmount = diffBal.sub(userAmount);
            if (feesAmount > 0) {
                // transfer fees to JFeesCollector
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(underTokenAddress), feesCollectorAddress, feesAmount);
            }
        }
     
        IJTrancheTokens(trancheAddresses[_trancheNum].ATrancheAddress).burn(_amount);

        lastActivity[msg.sender] = block.number;
        emit TrancheATokenRedemption(_trancheNum, msg.sender, 0, userAmount, feesAmount);
    }

    /**
     * @dev buy Tranche B Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function buyTrancheBToken(uint256 _trancheNum, uint256 _amount) external payable nonReentrant {
        require(trancheDepositEnabled[_trancheNum], "!Deposit");
        address qiTokenAddress = trancheAddresses[_trancheNum].qiTokenAddress;
        address underTokenAddress = trancheAddresses[_trancheNum].buyerCoinAddress;
        uint256 prevCompTokenBalance = getTokenBalance(qiTokenAddress);
        // if eth, ignore _amount parameter and set it to msg.value
        if (trancheAddresses[_trancheNum].buyerCoinAddress == address(0)) {
            require(msg.value == _amount, "!Amount");
            //_amount = msg.value;
        }
        // refresh value for tranche A
        setTrancheAExchangeRate(_trancheNum);
        // get tranche B exchange rate
        // if normalized price in tranche B price, everything should be scaled to 1e18 
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        uint256 normAmount = _amount.mul(10 ** diffDec);
        uint256 tbAmount = normAmount.mul(1e18).div(getTrancheBExchangeRate(_trancheNum, _amount));
        if (underTokenAddress == address(0)) {
            TransferAVAXHelper.safeTransferAVAX(address(this), _amount);
            // transfer ETH to Coompound receiving qiAvax
            qiAVAXToken.mint{value: _amount}();
        } else {
            // check approve
            require(IERC20Upgradeable(underTokenAddress).allowance(msg.sender, address(this)) >= _amount, "!Allowance");
            //Transfer DAI from msg.sender to protocol;
            SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(underTokenAddress), msg.sender, address(this), _amount);
            // transfer DAI to Couompound receiving cDai
            sendErc20ToCompound(underTokenAddress, _amount);
        }
        uint256 newCompTokenBalance = getTokenBalance(qiTokenAddress);
        if (newCompTokenBalance > prevCompTokenBalance) {
            IJTrancheTokens(trancheAddresses[_trancheNum].BTrancheAddress).mint(msg.sender, tbAmount);
        } else 
            tbAmount = 0;  

        lastActivity[msg.sender] = block.number;
        emit TrancheBTokenMinted(_trancheNum, msg.sender, _amount, tbAmount);
    }

    /**
     * @dev redeem Tranche B Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function redeemTrancheBToken(uint256 _trancheNum, uint256 _amount) external nonReentrant {
        require((block.number).sub(lastActivity[msg.sender]) >= redeemTimeout, "!Timeout");
        // check approve
        // address bTrancheAddress = trancheAddresses[_trancheNum].BTrancheAddress;
        require(IERC20Upgradeable(trancheAddresses[_trancheNum].BTrancheAddress).allowance(msg.sender, address(this)) >= _amount, "!Allowance");
        //Transfer DAI from msg.sender to protocol;
        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(trancheAddresses[_trancheNum].BTrancheAddress), msg.sender, address(this), _amount);

        uint256 oldBal;
        uint256 diffBal;
        uint256 userAmount;
        uint256 feesAmount;
        // refresh value for tranche A
        setTrancheAExchangeRate(_trancheNum);
        // get tranche B exchange rate
        // if normalized price in tranche B price, everything should be scaled to 1e18 
        uint256 tbAmount = _amount.mul(getTrancheBExchangeRate(_trancheNum, 0)).div(1e18);
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        uint256 normAmount = tbAmount.div(10 ** diffDec);

        address qiTokenAddress = trancheAddresses[_trancheNum].qiTokenAddress;
        uint256 qiTokenBal = getTokenBalance(qiTokenAddress); // needed for emergency
        address underTokenAddress = trancheAddresses[_trancheNum].buyerCoinAddress;
        uint256 redeemPerc = uint256(trancheParameters[_trancheNum].redemptionPercentage);
        if (underTokenAddress == address(0)){
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(qiTokenAddress), address(avaxGateway), qiTokenBal);
            // calculate tbETH amount via qiAvax price
            oldBal = getEthBalance();
            avaxGateway.withdrawAVAX(normAmount, address(this), false, qiTokenBal);
            diffBal = getEthBalance().sub(oldBal);
            userAmount = diffBal.mul(redeemPerc).div(PERCENT_DIVIDER);
            TransferAVAXHelper.safeTransferAVAX(msg.sender, userAmount);
            if (diffBal > userAmount && feesAmount > 0) {
                feesAmount = diffBal.sub(userAmount);
                // transfer fees to JFeesCollector
                TransferAVAXHelper.safeTransferAVAX(feesCollectorAddress, feesAmount);
            }   
        } else {
            // calculate taToken amount via qiToken price
            oldBal = getTokenBalance(underTokenAddress);
            uint256 retCode = redeemQiErc20Tokens(underTokenAddress, normAmount, false);
            if(retCode != 0) {
                // emergency: send all qiTokens balance to compound 
                redeemQiErc20Tokens(underTokenAddress, qiTokenBal, true); 
            }
            diffBal = getTokenBalance(underTokenAddress);
            userAmount = diffBal.mul(redeemPerc).div(PERCENT_DIVIDER);
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(underTokenAddress), msg.sender, userAmount);
            feesAmount = diffBal.sub(userAmount);
            if (feesAmount > 0) {
                // transfer fees to JFeesCollector
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(underTokenAddress), feesCollectorAddress, feesAmount);
            }   
        }

        IJTrancheTokens(trancheAddresses[_trancheNum].BTrancheAddress).burn(_amount);

        lastActivity[msg.sender] = block.number;
        emit TrancheBTokenRedemption(_trancheNum, msg.sender, 0, userAmount, feesAmount);
    }

    /**
     * @dev redeem every qiToken amount and send values to fees collector
     * @param _trancheNum tranche number
     * @param _qiTokenAmount qiToken amount to send to compound protocol
     */
    function redeemQiTokenAmount(uint256 _trancheNum, uint256 _qiTokenAmount) external onlyAdmins nonReentrant {
        uint256 oldBal;
        uint256 diffBal;
        address underTokenAddress = trancheAddresses[_trancheNum].buyerCoinAddress;
        uint256 qiTokenBal = getTokenBalance(trancheAddresses[_trancheNum].qiTokenAddress); // needed for emergency
        if (underTokenAddress == address(0)) {
            oldBal = getEthBalance();
            avaxGateway.withdrawAVAX(_qiTokenAmount, address(this), true, qiTokenBal);
            diffBal = getEthBalance().sub(oldBal);
            TransferAVAXHelper.safeTransferAVAX(feesCollectorAddress, diffBal);
        } else {
            // calculate taToken amount via qiToken price
            oldBal = getTokenBalance(underTokenAddress);
            require(redeemQiErc20Tokens(underTokenAddress, _qiTokenAmount, true) == 0, "!qiTokenAnswer");
            // address qiToken = qiTokenContracts[trancheAddresses[_trancheNum].buyerCoinAddress];
            // require(compRetCode == 0, "!qiTokenAnswer");
            diffBal = getTokenBalance(underTokenAddress);
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(underTokenAddress), feesCollectorAddress, diffBal);
        }
    }

    /**
     * @dev get every token balance in this contract
     * @param _tokenContract token contract address
     */
    function getTokenBalance(address _tokenContract) public view returns (uint256) {
        return IERC20Upgradeable(_tokenContract).balanceOf(address(this));
    }

    /**
     * @dev get eth balance on this contract
     */
    function getEthBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev transfer tokens in this contract to fees collector contract
     * @param _tokenContract token contract address
     * @param _amount token amount to be transferred 
     */
    function transferTokenToFeesCollector(address _tokenContract, uint256 _amount) external onlyAdmins {
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(_tokenContract), feesCollectorAddress, _amount);
    }

    /**
     * @dev transfer ethers in this contract to fees collector contract
     * @param _amount ethers amount to be transferred 
     */
    function withdrawAVAXToFeesCollector(uint256 _amount) external onlyAdmins {
        TransferAVAXHelper.safeTransferAVAX(feesCollectorAddress, _amount);
    }

    /**
     * @dev get total accrued Comp token from all market in comptroller
     * @return comp amount accrued
     */
    function getTotalQiAccrued() public view onlyAdmins returns (uint256) {
        return IComptrollerLensInterface(trollerAddress).compAccrued(address(this));
    }

    /**
     * @dev claim total accrued Comp token from all market in comptroller and transfer the amount to a receiver address
     * @param _receiver destination address
     */
    function claimTotalQiAccruedToReceiver(address _receiver) external onlyAdmins nonReentrant {
        uint256 totAccruedAmount = getTotalQiAccrued();
        if (totAccruedAmount > 0) {
            IComptrollerLensInterface(trollerAddress).claimComp(address(this));
            uint256 amount = IERC20Upgradeable(qiTokenAddress).balanceOf(address(this));
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(qiTokenAddress), _receiver, amount);
        }
    }

}