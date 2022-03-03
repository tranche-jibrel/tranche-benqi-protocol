require("dotenv").config();
const { expect } = require("chai");
const {
  BN,
  constants,
  ether,
  time,
  balance,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

const Web3 = require('web3');
// Ganache UI on 8545
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const timeMachine = require('ganache-time-traveler');

const fs = require('fs');
const DAI_ABI = JSON.parse(fs.readFileSync('./test/utils/Dai.abi', 'utf8'));
// console.log(JSON.stringify(contract.abi));

const mySlice = artifacts.require("mySLICE");
const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JBenQi = artifacts.require('JBenQi');
const JBenQiHelper = artifacts.require('JBenQiHelper');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

const {ZERO_ADDRESS} = constants;
const DAIE_HOLDER = "0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8";
const DAIE_ADDRESS = "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70";
const QIDAI = "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D";

let daiContract, jFCContract, jATContract, jTrDeplContract, jBQContract;
let daiTrAContract, daiTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);

contract("DAI.e JBenQi", function (accounts) {

  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("DAI.e total Supply sent to user1", async function () {
    daiContract = new web3.eth.Contract(DAI_ABI, DAIE_ADDRESS);
    result = await daiContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(DAIE_HOLDER).call()) + " DAI.e");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: DAIE_HOLDER, from: user1, value: web3.utils.toWei('2')})
    console.log(await web3.eth.getBalance(DAIE_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await daiContract.methods.transfer(user1, toWei(10000)).send({from: DAIE_HOLDER})
    console.log("UnBlockedAccount DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(DAIE_HOLDER).call()) + " DAI.e");
    console.log("user1 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
  });

  it("All other contracts ok", async function () {
    rewardTokenContract = await mySlice.deployed();
    expect(rewardTokenContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(rewardTokenContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(rewardTokenContract.address);

    jFCContract = await JFeesCollector.deployed();
    expect(jFCContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jFCContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jFCContract.address);

    jATContract = await JAdminTools.deployed();
    expect(jATContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jATContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jATContract.address);

    jTrDeplContract = await JTranchesDeployer.deployed();
    expect(jTrDeplContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jTrDeplContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jTrDeplContract.address);

    jBQContract = await JBenQi.deployed();
    expect(jBQContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jBQContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jBQContract.address);

    jCompHelperContract = await JBenQiHelper.deployed();
    expect(jCompHelperContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jCompHelperContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jCompHelperContract.address);

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

  it("user1 buys some token daiTrA", async function () {
    console.log("is Dai allowed in JBenQi: " + await jBQContract.isQiTokenAllowed(DAIE_ADDRESS));
    trAddresses = await jBQContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(1);
    console.log((await jCompHelperContract.getBenQiPriceHelper(trAddresses[1], trPars[6], trPars[5])).toString());
    trPar = await jBQContract.trancheParameters(1);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    console.log("rpb tranche A: " + trPar[3].toString());

    tx = await jBQContract.calcRPBFromPercentage(1, {from: user1});

    trPar = await jBQContract.trancheParameters(1);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + trPar[2].toString());
    trPar = await jBQContract.trancheParameters(1);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    trParams = await jBQContract.trancheAddresses(1);
    expect(trParams.buyerCoinAddress).to.be.equal(DAIE_ADDRESS);
    expect(trParams.qiTokenAddress).to.be.equal(QIDAI);
    console.log("User1 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    tx = await daiContract.methods.approve(jBQContract.address, toWei(1000)).send({from: user1});
    tx = await jBQContract.buyTrancheAToken(1, toWei(1000), {from: user1});
    console.log("User1 New DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    console.log("User1 trA tokens: " + fromWei(await daiTrAContract.balanceOf(user1)) + " DTA");
    // console.log("CErc20 DAI.e balance: " + fromWei(await daiContract.balanceOf(cERC20Contract.address), "ether") + " DAI.e");
    console.log("JBenQi DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(jBQContract.address).call()) + " DAI.e");
    console.log("JBenQi qiDAI balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIDAI)) + " qiDai");
    trPar = await jBQContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jBQContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(1);
    console.log("BenQi Price: " + await jCompHelperContract.getBenQiPriceHelper(trAddresses[1], trPars[6], trPars[5]));
    // console.log("BenQi Price: " + await jCompHelperContract.getBenQiPriceHelper(1));
    console.log("BenQi TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(1)));

    stkDetails = await jBQContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some other token daiTrA", async function () {
    tx = await daiContract.methods.approve(jBQContract.address, toWei(500)).send({from: user1});
    tx = await jBQContract.buyTrancheAToken(1, toWei(500), {from: user1});

    console.log("staker counter trA: " + (await jBQContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )

    stkDetails = await jBQContract.stakingDetailsTrancheA(user1, 1, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token daiTrB", async function () {
    console.log("User1 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    trAddr = await jBQContract.trancheAddresses(1);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei(await jBQContract.getTrBValue(1)));
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(1)));
    console.log("TrB total supply: " + fromWei(await daiTrBContract.totalSupply()));
    console.log("BenQi TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(1)));
    tx = await daiContract.methods.approve(jBQContract.address, toWei(1000)).send({from: user1});
    tx = await jBQContract.buyTrancheBToken(1, toWei(1000), {from: user1});
    console.log("User1 New DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    console.log("User1 trB tokens: " + fromWei(await daiTrBContract.balanceOf(user1)) + " DTB");
    // console.log("CErc20 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(QIDAI).call()) + " DAI.e");
    console.log("JBenQi DAI.e balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIDAI)) + " qiDai");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(1)));
    trAddresses = await jBQContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(1);
    console.log("BenQi Price: " + await jCompHelperContract.getBenQiPriceHelper(trAddresses[1], trPars[6], trPars[5]));
    trPar = await jBQContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("BenQi TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("TrB value: " + fromWei(await jBQContract.getTrBValue(1)));
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(1)));

    console.log("staker counter trB: " + (await jBQContract.stakeCounterTrB(user1, 1)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheB(user1, 1, 1);
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

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI.e");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    tot = await daiTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " DTA");
    console.log("JBenQi qiDai balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIDAI)) + " qiDai");
    tx = await daiTrAContract.approve(jBQContract.address, bal, {from: user1});
    trPar = await jBQContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log(await jATContract.isAdmin(jBQContract.address));

    tx = await jBQContract.redeemTrancheAToken(1, bal, {from: user1});

    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI.e");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " DAI.e");
    // console.log("CErc20 DAI.e balance: "+ fromWei(await daiContract.methods.balanceOf(QIDAI).call()) + " DAI.e");
    console.log("JBenQi new DAI.e balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIDAI)) + " qiDai");
    console.log("BenQi TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(1)));

    console.log("staker counter trA: " + (await jBQContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
    stkDetails = await jBQContract.stakingDetailsTrancheA(user1, 1, 2);
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

  it("user1 redeems token daiTrB", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI.e");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("JBenQi qiDai balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIDAI)) + " qiDai");
    tx = await daiTrBContract.approve(jBQContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(1)));
    console.log("TrB value: " +  fromWei(await jBQContract.getTrBValue(1)));
    console.log(await jATContract.isAdmin(jBQContract.address));

    tx = await jBQContract.redeemTrancheBToken(1, bal, {from: user1});
    
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI.e");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " DAI.e");
    console.log("JBenQi new DAI.e balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIDAI)) + " qiDai");
    console.log("TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("TrB value: " +  fromWei(await jBQContract.getTrBValue(1)));
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(1)));

    console.log("staker counter trB: " + (await jBQContract.stakeCounterTrB(user1, 1)).toString())
    stkDetails = await jBQContract.stakingDetailsTrancheB(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 


});