require('dotenv').config();
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

var mySLICE = artifacts.require("./mocks/mySLICE.sol");

var Chainlink1 = artifacts.require("./mocks/Chainlink1.sol");
var Chainlink2 = artifacts.require("./mocks/Chainlink2.sol");

var JAdminTools = artifacts.require("JAdminTools.sol");
var JFeesCollector = artifacts.require("JFeesCollector.sol");
var JBenQi = artifacts.require('JBenQi');
var JBenQiHelper = artifacts.require('JBenQiHelper');
var JTranchesDeployer = artifacts.require('JTranchesDeployer');

var JTrancheAToken = artifacts.require('JTrancheAToken');
var JTrancheBToken = artifacts.require('JTrancheBToken');

var AvaxGateway = artifacts.require('AVAXGateway');

var MarketHelper = artifacts.require("MarketHelper.sol");
var PriceHelper = artifacts.require("PriceHelper.sol");
var IncentivesController = artifacts.require("IncentivesController.sol");

module.exports = async (deployer, network, accounts) => {
  const MYERC20_TOKEN_SUPPLY = 5000000;

  const TROLLER_ADDRESS = "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4";

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const QIAVAX = "0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c";
  const USDTETOKEN = "0xc7198437980c041c805A1EDcbA50c1Ce5db95118";  // 6 decs
  const QIUSDT = "0xc9e5999b8e75C3fEB117F6f73E664b9f3C8ca65C";
  const USDCETOKEN = "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";
  const QIUSDC = "0xBEb5d47A3f720Ec0a390d04b4d41ED7d9688bC7F";
  const DAIETOKEN = "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70";
  const QIDAI = "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D";
  const LINKETOKEN = "0x5947BB275c521040051D82396192181b413227A3";
  const QILINK = "0x4e9f683A27a6BdAD3FC2764003759277e93696e6";
  const WBTCETOKEN = "0x50b7545627a5162F82A992c33b87aDc75187B218";  // 8 decs
  const QIBTC = "0xe194c4c5aC32a3C9ffDb358d9Bfd523a0B6d1568";
  const QIETH = "0x334AD834Cd4481BB02d09615E7c11a00579A7909";
  const QITOKEN = "0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5";
  const QIQI = "0x35Bd6aedA81a7E5FC7A7832490e71F757b0cD9Ce";

  if (network == "development") {
    const tokenOwner = accounts[0];

    const mySLICEinstance = await deployProxy(mySLICE, [MYERC20_TOKEN_SUPPLY], { from: tokenOwner });
    console.log('mySLICE Deployed: ', mySLICEinstance.address);

    const factoryOwner = accounts[0];
    const JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
    console.log('JAdminTools Deployed: ', JATinstance.address);

    const JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
    console.log('JFeesCollector Deployed: ', JFCinstance.address);

    const JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
    console.log("Tranches Deployer: " + JTDeployer.address);

    const JBQInstance = await deployProxy(JBenQi, [JATinstance.address, JFCinstance.address, JTDeployer.address,
      QITOKEN, TROLLER_ADDRESS, mySLICEinstance.address], { from: factoryOwner });
    console.log('JBenQi Deployed: ', JBQInstance.address);

    await deployer.deploy(AvaxGateway, QIAVAX, JBQInstance.address);
    const JEGinstance = await AvaxGateway.deployed();
    console.log('AvaxGateway Deployed: ', JEGinstance.address);

    await JATinstance.addAdmin(JBQInstance.address, { from: factoryOwner })
    await JATinstance.addAdmin(JTDeployer.address, { from: factoryOwner })

    await JTDeployer.setBenQiAddresses(JBQInstance.address, JATinstance.address, { from: factoryOwner });

    await JBQInstance.setAVAXGateway(JEGinstance.address, { from: factoryOwner });

    const JBQHelper = await deployProxy(JBenQiHelper, [/*JBQInstance.address*/], { from: factoryOwner });
    console.log("JC Helper: " + JBQHelper.address);

    await JBQInstance.setBenQiHelperAddress(JBQHelper.address)

    await JBQInstance.setQiAvaxContract(QIAVAX, { from: factoryOwner });
    await JBQInstance.addTrancheToProtocol(ZERO_ADDRESS, "Avax Tranche A Token", "JAA", "Avax Tranche B Token", "JAB", web3.utils.toWei("0.04", "ether"), 8, 18, { from: factoryOwner });
    trParams = await JBQInstance.trancheAddresses(0);
    let EthTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("AVAX Tranche A Token Address: " + EthTrA.address);
    let EthTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("AVAX Tranche B Token Address: " + EthTrB.address);
    await JBQInstance.setTrancheDeposit(0, true); // enabling deposit

    await JBQInstance.setQiTokenContract(DAIETOKEN, QIDAI, { from: factoryOwner });
    await JBQInstance.addTrancheToProtocol(DAIETOKEN, "DAI.E Tranche A Token", "JDA", "DAI.E Tranche B Token", "JDB", web3.utils.toWei("0.02", "ether"), 8, 18, { from: factoryOwner });
    trParams = await JBQInstance.trancheAddresses(1);
    let DaiTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("DAI Tranche A Token Address: " + DaiTrA.address);
    let DaiTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("DAI Tranche B Token Address: " + DaiTrB.address);
    await JBQInstance.setTrancheDeposit(1, true); // enabling deposit

    await JBQInstance.setQiTokenContract(USDTETOKEN, QIUSDT, { from: factoryOwner });
    await JBQInstance.addTrancheToProtocol(USDTETOKEN, "USDT.E Tranche A Token", "JUA", "USDT.E Tranche B Token", "JUB", web3.utils.toWei("0.02", "ether"), 8, 6, { from: factoryOwner });
    trParams = await JBQInstance.trancheAddresses(2);
    let UsdtTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("USDT Tranche A Token Address: " + UsdtTrA.address);
    let UsdtTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("USDT Tranche B Token Address: " + UsdtTrB.address);
    await JBQInstance.setTrancheDeposit(2, true); // enabling deposit

    const myChainlink1Inst = await deployProxy(Chainlink1, [], {
      from: factoryOwner
    });
    console.log('myChainlink1 Deployed: ', myChainlink1Inst.address);

    const myChainlink2Inst = await deployProxy(Chainlink2, [], {
      from: factoryOwner
    });
    console.log('myChainlink2 Deployed: ', myChainlink2Inst.address);

    const myPriceHelperInst = await deployProxy(PriceHelper, [], {
      from: factoryOwner
    });
    console.log('myPriceHelper Deployed: ', myPriceHelperInst.address);

    const myMktHelperinstance = await deployProxy(MarketHelper, [], {
      from: factoryOwner
    });
    console.log('myMktHelperinstance Deployed: ', myMktHelperinstance.address);

    const myIncentivesControllerInstance =
      await deployProxy(IncentivesController, [mySLICEinstance.address, myMktHelperinstance.address, myPriceHelperInst.address], {
        from: tokenOwner
      });
    console.log('myIncentivesControllerInstance Deployed: ', myIncentivesControllerInstance.address);

    await myPriceHelperInst.setControllerAddress(myIncentivesControllerInstance.address, { from: tokenOwner })

    await JBQInstance.setIncentivesControllerAddress(myIncentivesControllerInstance.address)

  } else if (network == "fuji") {
    let {
      IS_UPGRADE, TRANCHE_ONE_TOKEN_ADDRESS, TRANCHE_ONE_CTOKEN_ADDRESS, TRANCHE_TWO_TOKEN_ADDRESS, TRANCHE_TWO_CTOKEN_ADDRESS, COMP_ADDRESS, COMP_CONTROLLER, SLICE_ADDRESS, FEE_COLLECTOR_ADDRESS
    } = process.env;
    const accounts = await web3.eth.getAccounts();
    const factoryOwner = accounts[0];
    if (IS_UPGRADE == 'true') {
      console.log('contracts are being upgraded');
      const JFCinstance = await upgradeProxy("0xc5639ad2431BBf031f70501c70b47C321867367E", JBenQi, { from: factoryOwner });
      console.log(`FEE_COLLECTOR_ADDRESS=${JFCinstance.address}`)
    } else {
      // deployed new contract
      try {
        const JATinstance = await JAdminTools.at("0xb1c8993C9C8Fb4bCBFA07a7688f0BDd3Ad6775C0");
        console.log('JAdminTools Deployed: ', JATinstance.address);

        const JFCinstance = await JFeesCollector.at("0xC0c7EFB8d45dC65ed343FC6e6433812cB43315b1");
        console.log('JFeesCollector Deployed: ', JFCinstance.address);

        const compoundDeployer = await JTranchesDeployer.at("0x19f792fBA533D5fa9b30da496fA4Cb06CBCdD1cc")
        console.log(`COMPOUND_DEPLOYER=${compoundDeployer.address}`);

        // Source: https://github.com/compound-finance/compound-config/blob/master/networks/kovan.json
        const JBenQiInstance = await deployProxy(JBenQi, [JATinstance.address, JFCinstance.address, compoundDeployer.address, COMP_ADDRESS, COMP_CONTROLLER, SLICE_ADDRESS],
          { from: factoryOwner });

        console.log(`COMPOUND_TRANCHE_ADDRESS=${JBenQiInstance.address}`);
        compoundDeployer.setJBenQiAddress(JBenQiInstance.address);
        console.log('compound deployer 1');

        const JBQHelper = await deployProxy(JBenQiHelper, [], { from: factoryOwner });
        console.log("JC Helper: " + JBQHelper.address);

        await JBenQiInstance.setJBenQiHelperAddress(JBQHelper.address)


        await JBenQiInstance.setCTokenContract(TRANCHE_ONE_TOKEN_ADDRESS, TRANCHE_ONE_CTOKEN_ADDRESS, { from: factoryOwner });
        console.log('compound deployer 2');

        await JBenQiInstance.setCTokenContract(TRANCHE_TWO_TOKEN_ADDRESS, TRANCHE_TWO_CTOKEN_ADDRESS, { from: factoryOwner });

        console.log('compound deployer 3');
        await JBenQiInstance.addTrancheToProtocol(TRANCHE_ONE_TOKEN_ADDRESS, "Tranche A - Compound DAI", "ACDAI", "Tranche B - Compound DAI", "BCDAI", web3.utils.toWei("0.04", "ether"), 8, 18, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(0, true); // enabling deposit
        console.log('compound deployer 4');
        //await JBenQiInstance.addTrancheToProtocol(ZERO_ADDRESS, "Tranche A - Compound ETH", "ACETH", "Tranche B - Compound ETH", "BCETH", web3.utils.toWei("0.04", "ether"), 8, 18, { from: factoryOwner });
        // await JBenQiInstance.addTrancheToProtocol("0xb7a4f3e9097c08da09517b5ab877f7a917224ede", "Tranche A - Compound USDC", "ACUSDC", "Tranche B - Compound USDC", "BCUSDC", web3.utils.toWei("0.02", "ether"), 8, 6, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(TRANCHE_TWO_TOKEN_ADDRESS, "Tranche A - Compound USDT", "ACUSDT", "Tranche B - Compound USDT", "BCUSDT", web3.utils.toWei("0.02", "ether"), 8, 6, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(1, true); // enabling deposit

        trParams = await JBenQiInstance.trancheAddresses(0);
        let DaiTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
        let DaiTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
        trParams = await JBenQiInstance.trancheAddresses(1);
        let USDTTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
        let USDTTrB = await JTrancheBToken.at(trParams.BTrancheAddress);

        console.log(`COMPOUND_TRANCHE_ADDRESS=${JBenQiInstance.address}`);
        console.log(`REACT_APP_COMP_TRANCHE_TOKENS=${DaiTrA.address},${DaiTrB.address},${USDTTrA.address},${USDTTrB.address}`)
      } catch (error) {
        console.log(error);
      }
    }
  } else if (network == "avaxmainnet" || network == 'development1') {
    let {
      IS_UPGRADE,
      ADMIN_TOOLS,
      FEE_COLLECTOR_ADDRESS,
      WETH_GATEWAY,
      MOCK_INCENTIVE_CONTROLLER,
      WAVAX_ADDRESS,
      QI_CONTROLLER,
      REWARD_TOKEN_ADDRESS,

      AVAX_ADDRESS, qiWAVAX_ADDRESS,

      WETH_ADDRESS, qiWETH_ADDRESS,

      WBTC_ADDRESS, qiWBTC_ADDRESS,

      DAI_ADDRESS, qiDAI_ADDRESS,

      USDT_ADDRESS, qiUSDT_ADDRESS,

      USDC_ADDRESS, qiUSDC_ADDRESS,

      LINK_ADDRESS, qiLINK_ADDRESS,

      QI_ADDRESS, qiQI_ADDRESS
    } = process.env;
    const accounts = await web3.eth.getAccounts();
    const factoryOwner = accounts[0];
    console.log(factoryOwner)
    if (IS_UPGRADE == 'true') {
      console.log('contracts are being upgraded');
    } else {
      try {
        let JATinstance = null;
        let JFCinstance = null;
        let JWGinstance = null
        if (!ADMIN_TOOLS) {
          JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
          console.log('JAdminTools Deployed: ', JATinstance.address);
        } else {
          JATinstance = await JAdminTools.at(ADMIN_TOOLS);
        }
        if (!FEE_COLLECTOR_ADDRESS) {
          JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
          console.log('JFeesCollector Deployed: ', JFCinstance.address);
        } else {
          JFCinstance = {
            address: FEE_COLLECTOR_ADDRESS
          }
        }

        const JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
        console.log("BENQI_DEPLOYER " + JTDeployer.address);

        await JATinstance.addAdmin(JTDeployer.address, { from: factoryOwner })
        console.log('admin added 1');

        const JBenQiInstance = await deployProxy(JBenQi, [JATinstance.address, JFCinstance.address, JTDeployer.address,
          QI_ADDRESS, QI_CONTROLLER, REWARD_TOKEN_ADDRESS], { from: factoryOwner });
        console.log('BENQI_TRANCHE_ADDRESS=', JBenQiInstance.address)

        await JTDeployer.setBenQiAddresses(JBenQiInstance.address, JATinstance.address, { from: factoryOwner });
        console.log('deployer 1');

        await JATinstance.addAdmin(JBenQiInstance.address, { from: factoryOwner })
        console.log('admin added 2');

        if (!WETH_GATEWAY) {
          await deployer.deploy(AvaxGateway, WAVAX_ADDRESS, JBenQiInstance.address);
          JWGinstance = await AvaxGateway.deployed();
          console.log('WETH_GATEWAY', JWGinstance.address);
        } else {
          JWGinstance = await AvaxGateway.at(WETH_GATEWAY)
          await JWGinstance.setJBenQiAddress(JBenQiInstance.address);
        }

        await JBenQiInstance.setAVAXGateway(JWGinstance.address, { from: factoryOwner });
        console.log('deployer 2');

        const JBQHelper = await deployProxy(JBenQiHelper, [], { from: factoryOwner });
        console.log("BENQI_HELPER: " + JBQHelper.address);

        await JBenQiInstance.setBenQiHelperAddress(JBQHelper.address)
        console.log('deployer 3');

        await JBenQiInstance.setQiAvaxContract(QIAVAX, { from: factoryOwner });
        console.log('deployer 4');

        //tranche 1  AVAX_ADDRESS,qiWAVAX_ADDRESS, 2.27%
        await JBenQiInstance.setQiTokenContract(AVAX_ADDRESS, qiWAVAX_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(AVAX_ADDRESS, "Tranche A - BENQI Avalanche AVAX", "aqiAVAX", "Tranche B - BENQI Avalanche AVAX", "bqiAVAX", web3.utils.toWei("0.0227", "ether"), 8, 18, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(0, true, { from: factoryOwner });
        console.log('added tranche 1')

        //tranche 2  WETH_ADDRESS, qiWETH_ADDRESS, 0.53%
        await JBenQiInstance.setQiTokenContract(WETH_ADDRESS, qiWETH_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(WETH_ADDRESS, "Tranche A - BENQI Avalanche WETH", "aqiWETH", "Tranche B - BENQI Avalanche WETH", "bqiWETH", web3.utils.toWei("0.0053", "ether"), 8, 18, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(1, true, { from: factoryOwner });
        console.log('added tranche 2')

        //tranche 3  WBTC_ADDRESS, qiWBTC_ADDRESS, 0.98%
        await JBenQiInstance.setQiTokenContract(WBTC_ADDRESS, qiWBTC_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(WBTC_ADDRESS, "Tranche A - BENQI Avalanche WBTC", "aqiWBTC", "Tranche B - BENQI Avalanche WBTC", "bqiWBTC", web3.utils.toWei("0.0098", "ether"), 8, 8, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(2, true, { from: factoryOwner });
        console.log('added tranche 3');

        //tranche 4  DAI_ADDRESS, qiDAI_ADDRESS, 2.88%
        await JBenQiInstance.setQiTokenContract(DAI_ADDRESS, qiDAI_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(DAI_ADDRESS, "Tranche A - BENQI Avalanche DAI", "aqiDAI", "Tranche B - BENQI Avalanche DAI", "bqiDAI", web3.utils.toWei("0.0288", "ether"), 8, 18, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(3, true, { from: factoryOwner });
        console.log('added tranche 4');

        //tranche 5  USDT_ADDRESS, qiUSDT_ADDRESS,2.59%
        await JBenQiInstance.setQiTokenContract(USDT_ADDRESS, qiUSDT_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(USDT_ADDRESS, "Tranche A - BENQI Avalanche USDT", "aqiUSDT", "Tranche B - BENQI Avalanche USDT", "bqiUSDT", web3.utils.toWei("0.0259", "ether"), 8, 6, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(4, true, { from: factoryOwner });
        console.log('added tranche 5');


        //tranche 6 USDC_ADDRESS, qiUSDC_ADDRESS,2.57%
        await JBenQiInstance.setQiTokenContract(USDC_ADDRESS, qiUSDC_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(USDC_ADDRESS, "Tranche A - BENQI Avalanche USDC", "aqiUSDC", "Tranche B - BENQI Avalanche USDC", "bqiUSDC", web3.utils.toWei("0.0257", "ether"), 8, 6, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(5, true, { from: factoryOwner });
        console.log('added tranche 6');

        //tranche 7 LINK_ADDRESS, qiLINK_ADDRESS,1.15%
        await JBenQiInstance.setQiTokenContract(LINK_ADDRESS, qiLINK_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(LINK_ADDRESS, "Tranche A - BENQI Avalanche LINK", "aqiLINK", "Tranche B - BENQI Avalanche LINK", "bqiLINK", web3.utils.toWei("0.0115", "ether"), 8, 18, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(6, true, { from: factoryOwner });
        console.log('added tranche 7');

        //tranche 8 QI_ADDRESS, qiQI_ADDRESS,17.62%
        await JBenQiInstance.setQiTokenContract(QI_ADDRESS, qiQI_ADDRESS, { from: factoryOwner });
        await JBenQiInstance.addTrancheToProtocol(QI_ADDRESS, "Tranche A - BENQI Avalanche QI", "aqiQI", "Tranche B - BENQI Avalanche QI", "bqiQI", web3.utils.toWei("0.1762", "ether"), 8, 18, { from: factoryOwner });
        await JBenQiInstance.setTrancheDeposit(7, true, { from: factoryOwner });
        console.log('added tranche 8');

        if (!MOCK_INCENTIVE_CONTROLLER) {
          const JIController = await deployProxy(IncentivesController, [], { from: factoryOwner });
          console.log("MOCK_INCENTIVE_CONTROLLER " + JIController.address);
          await JBenQiInstance.setIncentivesControllerAddress(JIController.address);
          console.log('incentive controller setup')
        } else {
          await JBenQiInstance.setIncentivesControllerAddress(MOCK_INCENTIVE_CONTROLLER);
          console.log('incentive controller setup')
        }

        trParams = await JBenQiInstance.trancheAddresses(0);
        let tranche1A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche1B = await JTrancheBToken.at(trParams.BTrancheAddress);
        trParams = await JBenQiInstance.trancheAddresses(1);
        let tranche2A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche2B = await JTrancheBToken.at(trParams.BTrancheAddress);
        trParams = await JBenQiInstance.trancheAddresses(2);
        let tranche3A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche3B = await JTrancheBToken.at(trParams.BTrancheAddress);

        trParams = await JBenQiInstance.trancheAddresses(3);
        let tranche4A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche4B = await JTrancheBToken.at(trParams.BTrancheAddress);

        trParams = await JBenQiInstance.trancheAddresses(4);
        let tranche5A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche5B = await JTrancheBToken.at(trParams.BTrancheAddress);

        trParams = await JBenQiInstance.trancheAddresses(5);
        let tranche6A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche6B = await JTrancheBToken.at(trParams.BTrancheAddress);

        trParams = await JBenQiInstance.trancheAddresses(6);
        let tranche7A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche7B = await JTrancheBToken.at(trParams.BTrancheAddress);

        trParams = await JBenQiInstance.trancheAddresses(7);
        let tranche8A = await JTrancheAToken.at(trParams.ATrancheAddress);
        let tranche8B = await JTrancheBToken.at(trParams.BTrancheAddress);

        console.log(`REACT_APP_BENQI_TRANCHE_TOKENS=${tranche1A.address},${tranche2A.address},${tranche3A.address},${tranche4A.address},${tranche5A.address},${tranche6A.address},${tranche7A.address},${tranche8A.address}
        ${tranche1B.address},${tranche2B.address},${tranche3B.address},${tranche4B.address},${tranche5B.address},${tranche6B.address},${tranche7B.address}, ${tranche8B.address}`)

      } catch (error) {
        console.log(error);
      }
    }
  }
}