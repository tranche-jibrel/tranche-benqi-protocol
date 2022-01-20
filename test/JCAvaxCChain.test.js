const {
  deployProxy,
  upgradeProxy
} = require('@openzeppelin/truffle-upgrades');
const {
  expect
} = require('chai');

const Web3 = require('web3');
// Ganache UI on 8545
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time
} = require('@openzeppelin/test-helpers');

const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JBenQi = artifacts.require('JBenQi');
const JBenQiHelper = artifacts.require('JBenQiHelper');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

const AvaxGateway = artifacts.require('AVAXGateway');

// const MYERC20_TOKEN_SUPPLY = 5000000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const QIAVAX = "0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c";

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);

let daiContract, cEtherContract, cERC20Contract, jFCContract, jATContract, jTrDeplContract, jBQContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract;
let tokenOwner, user1;

contract("AVAX JBenQi", function (accounts) {

  it("AVAX balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("All other contracts ok", async function () {
    jFCContract = await JFeesCollector.at("0xb73567C2F39B21504aD4A5855Ec8b645e5Af0Bbf");
    expect(jFCContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jFCContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jFCContract.address);

    jATContract = await JAdminTools.at("0xA61434316250C99A81Af8a9a492fcfD86766367E");
    expect(jATContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jATContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jATContract.address);

    jTrDeplContract = await JTranchesDeployer.at("0x16EA9EcE341A2161E2219852b4e6bBF21Dfb640B");
    expect(jTrDeplContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jTrDeplContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jTrDeplContract.address);

    jBQContract = await JBenQi.at("0xCFe4361DE14776D40c736676a281ADE27945D393");
    expect(jBQContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jBQContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jBQContract.address);
    // await jBQContract.setRedemptionTimeout(0, {
    //   from: accounts[0]
    // });

    jBQHelperContract = await JBenQiHelper.at("0x534C5969CB93469Ec9fD667fcc03a76e49B6C846");
    expect(jBQHelperContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jBQHelperContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jBQHelperContract.address);

    trParams0 = await jBQContract.trancheAddresses(0);
    ethTrAContract = await JTrancheAToken.at(trParams0.ATrancheAddress);
    expect(ethTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(ethTrAContract.address);

    ethTrBContract = await JTrancheBToken.at(trParams0.BTrancheAddress);
    expect(ethTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(ethTrBContract.address);

    trParams1 = await jBQContract.trancheAddresses(1);
    daiTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(daiTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrAContract.address);

    daiTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(daiTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrBContract.address);
  });

  it("ETH Gateway", async function () {
    avaxGatewayContract = await AvaxGateway.at("0x50801DBBAF43f2c488FA2E1fE6d9255CE28A00E5");
    expect(avaxGatewayContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(avaxGatewayContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(avaxGatewayContract.address);
  });

  it("user1 buys some token AvaxTrA", async function () {
    console.log(user1);
    console.log("User1 Avax balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    trAddresses = await jBQContract.trancheAddresses(0); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(0);
    console.log("BenQi Price: " + await jBQHelperContract.getBenQiPriceHelper(trAddresses[1], trPars[6], trPars[5]));
    trPar = await jBQContract.trancheParameters(0);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    console.log("rpb tranche A: " + trPar[3].toString());
    tx = await jBQContract.calcRPBFromPercentage(0, {
      from: user1
    });

    trPar = await jBQContract.trancheParameters(0);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trPar = await jBQContract.trancheParameters(0);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
    "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    tx = await jBQContract.buyTrancheAToken(0, toWei("1"), {
      from: user1,
      value: toWei("1")
    });
    console.log("User1 New Avax balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    console.log("User1 trA tokens: " + fromWei(await ethTrAContract.balanceOf(user1)) + " JAA");
    console.log("JBenQi qiAVAX balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    trPar = await jBQContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jBQContract.trancheAddresses(0); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(0);
    console.log("BenQi Price: " + await jBQHelperContract.getBenQiPriceHelper(trAddresses[1], trPars[6], trPars[5]));
    trPar = await jBQContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
  
    console.log("staker counter trA: " + (await jBQContract.stakeCounterTrA(user1, 0)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token EthTrB", async function () {
    //console.log("User1 Avax balance: "+ fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    tx = await jBQContract.buyTrancheBToken(0, toWei("1"), {
      from: user1,
      value: toWei("1")
    });
    console.log("User1 New Avax balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    console.log("User1 trB tokens: " + fromWei(await ethTrBContract.balanceOf(user1)) + " JAB");
    console.log("JBenQi qiAVAX balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(0, 0)));
  
    console.log("staker counter trB: " + (await jBQContract.stakeCounterTrB(user1, 0)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheB(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token AvaxTrA", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 Avax balance: " + oldBal + " AVAX");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JAA");
    console.log("JBenQi qiAVAX balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    console.log("qiAVAX eth bal: " + fromWei(await web3.eth.getBalance(QIAVAX)));
    trPar = await jBQContract.trancheParameters(0);
    stPrice = trPar.storedTrancheAPrice * Math.pow(10, -18);
    //console.log(stPrice.toString());
    tempAmnt = bal * Math.pow(10, -18);
    //console.log(tempAmnt.toString())
    taAmount = tempAmnt * stPrice;
    console.log(taAmount);
    tx = await ethTrAContract.approve(jBQContract.address, bal, {from: user1});
    // await expectRevert.unspecified(jBQContract.redeemTrancheAToken(0, bal, {
    //   from: user1
    // }));
    tx = await jBQContract.redeemTrancheAToken(0, bal, {from: user1});
    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Avax balance: " + newBal + " AVAX");
    console.log("User1 trA interest: " + (newBal - oldBal) + " AVAX");
    console.log("User1 trA tokens: " + fromWei(await ethTrAContract.balanceOf(user1)) + " JAA");
    console.log("JBenQi new qiAVAX balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    trPar = await jBQContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
  
    console.log("staker counter trA: " + (await jBQContract.stakeCounterTrA(user1, 0)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token EthTrB", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 Avax balance: " + oldBal + " AVAX");
    bal = await ethTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " JAB");
    console.log("JBenQi qiAVAX balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    trbPrice = fromWei(await jBQContract.getTrancheBExchangeRate(0, 0))
    console.log("TrB price: " + trbPrice);
    console.log("qiAVAX eth bal:" + fromWei(await web3.eth.getBalance(QIAVAX)));
    //console.log(stPrice.toString());
    tempAmnt = bal * Math.pow(10, -18);
    //console.log(tempAmnt.toString())
    taAmount = tempAmnt * trbPrice;
    console.log(taAmount);
    tx = await ethTrBContract.approve(jBQContract.address, bal, {from: user1});
    // await expectRevert.unspecified(jBQContract.redeemTrancheBToken(0, bal, {
    //   from: user1
    // }));
    tx = await jBQContract.redeemTrancheBToken(0, bal, {from: user1});
    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Avax balance: " + newBal + " AVAX");
    console.log("User1 trB interest: " + (newBal - oldBal) + " AVAX");
    console.log("User1 trB tokens: " + fromWei(await ethTrBContract.balanceOf(user1)) + " JAB");
    console.log("JBenQi new qiAVAX balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(0, 0)));
  
    console.log("staker counter trB: " + (await jBQContract.stakeCounterTrB(user1, 0)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheB(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });
});