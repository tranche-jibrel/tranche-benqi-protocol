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
const DAI_ABI = JSON.parse(fs.readFileSync('./test/utils/Usdt.abi', 'utf8'));
// console.log(JSON.stringify(contract.abi));

const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JBenQi = artifacts.require('JBenQi');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

// const MYERC20_TOKEN_SUPPLY = 5000000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const USDT_HOLDER = "0xA9497FD9D1dD0d00DE1Bf988E0e36794848900F9";
const USDT_ADDRESS = "0xc7198437980c041c805A1EDcbA50c1Ce5db95118";
const QIUSDT = "0xc9e5999b8e75C3fEB117F6f73E664b9f3C8ca65C";

let usdtContract, jFCContract, jATContract, jTrDeplContract, jBQContract;
let usdtTrAContract, usdtTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);
const fromWei6Dec = (x) => x / Math.pow(10, 6);
const toWei6Dec = (x) => x * Math.pow(10, 6);

contract("USDT.e JBenQi", function (accounts) {

  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("USDT.e total Supply sent to user1", async function () {
    usdtContract = new web3.eth.Contract(DAI_ABI, USDT_ADDRESS);
    result = await usdtContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(USDT_HOLDER).call()) + " USDT.e");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: USDT_HOLDER, from: user1, value: web3.utils.toWei('2')})
    console.log(await web3.eth.getBalance(USDT_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await usdtContract.methods.transfer(user1, toWei6Dec(10000)).send({from: USDT_HOLDER})
    console.log("UnBlockedAccount USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(USDT_HOLDER).call()) + " USDT.e");
    console.log("user1 USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(user1).call()) + " USDT.e");
  });

  it("All other contracts ok", async function () {
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

    trParams2 = await jBQContract.trancheAddresses(2);
    usdtTrAContract = await JTrancheAToken.at(trParams2.ATrancheAddress);
    expect(usdtTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdtTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdtTrAContract.address);

    usdtTrBContract = await JTrancheBToken.at(trParams2.BTrancheAddress);
    expect(usdtTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdtTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdtTrBContract.address);
    
  });

  it("user1 buys some token usdtTrA", async function () {
    console.log("is Usdt.e allowed in JBenQi: " + await jBQContract.isQiTokenAllowed(USDT_ADDRESS));
    trAddresses = await jBQContract.trancheAddresses(2); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(2);
    console.log((await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5])).toString());
    trPar = await jBQContract.trancheParameters(2);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    console.log("rpb tranche A: " + trPar[3].toString());

    tx = await jBQContract.calcRPBFromPercentage(1, {from: user1});

    trPar = await jBQContract.trancheParameters(2);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + trPar[2].toString());
    trPar = await jBQContract.trancheParameters(2);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    trParams = await jBQContract.trancheAddresses(2);
    expect(trParams.buyerCoinAddress).to.be.equal(USDT_ADDRESS);
    expect(trParams.qiTokenAddress).to.be.equal(QIUSDT);
    console.log("User1 USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(user1).call()) + " USDT.e");

    tx = await usdtContract.methods.approve(jBQContract.address, toWei6Dec(1000)).send({from: user1});
    tx = await jBQContract.buyTrancheAToken(2, toWei6Dec(1000), {from: user1});

    console.log("User1 New USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(user1).call()) + " USDT.e");
    console.log("User1 trA tokens: " + fromWei(await usdtTrAContract.balanceOf(user1)) + " JUA");
    // console.log("CErc20 USDT.e balance: " + fromWei6Dec(await usdtContract.balanceOf(cERC20Contract.address), "ether") + " USDT.e");
    console.log("JBenQi USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(jBQContract.address).call()) + " USDT.e");
    console.log("JBenQi qiDAI balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIUSDT)) + " qiUsdt");
    trPar = await jBQContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jBQContract.trancheAddresses(2); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(2);
    console.log("BenQi Price: " + await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5]));
    // console.log("BenQi Price: " + await jBQContract.getBenQiPrice(1));
    console.log("BenQi TrA Value: " + fromWei(await jBQContract.getTrAValue(2)));
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(2)));
  });

  it("user1 buys some other token usdtTrA", async function () {
    tx = await usdtContract.methods.approve(jBQContract.address, toWei6Dec(500)).send({from: user1});
    tx = await jBQContract.buyTrancheAToken(2, toWei6Dec(500), {from: user1});
  });

  it("user1 buys some token usdtTrB", async function () {
    console.log("User1 USDT.e balance: " + fromWei(await usdtContract.methods.balanceOf(user1).call()) + " USDT.e");
    trAddr = await jBQContract.trancheAddresses(2);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei6Dec(await jBQContract.getTrBValue(2)) + " USDT.e");
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(2)));
    console.log("TrB total supply: " + fromWei(await usdtTrBContract.totalSupply()));
    console.log("BenQi TrA Value: " + fromWei(await jBQContract.getTrAValue(2)));
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(2)));

    tx = await usdtContract.methods.approve(jBQContract.address, toWei6Dec(1000)).send({from: user1});
    tx = await jBQContract.buyTrancheBToken(2, toWei6Dec(1000), {from: user1});

    console.log("User1 New USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(user1).call()) + " USDT.e");
    console.log("User1 trB tokens: " + fromWei(await usdtTrBContract.balanceOf(user1)) + " JUB");
    // console.log("CErc20 USDT.e balance: " + fromWei6Dec(await usdtContract.methods.balanceOf(QIUSDT).call()) + " USDT.e");
    console.log("JBenQi USDT.e balance: " + fromWei8Dec(await jBQContract.getTokenBalance(QIUSDT)) + " qiUsdt");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(2)));
    trAddresses = await jBQContract.trancheAddresses(2); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(2);
    console.log("BenQi Price: " + await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5]));
    trPar = await jBQContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("BenQi TrA Value: " + fromWei6Dec(await jBQContract.getTrAValue(2)));
    console.log("TrB value: " + fromWei6Dec(await jBQContract.getTrBValue(2)));
    console.log("BenQi total Value: " + fromWei6Dec(await jBQContract.getTotalValue(2)));
  });

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token usdtTrA", async function () {
    oldBal = fromWei6Dec(await usdtContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " USDT.e");
    bal = await usdtTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JUA");
    tot = await usdtTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " JUA");
    console.log("JBenQi qiUsdt balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIUSDT)) + " qiUsdt");
    tx = await usdtTrAContract.approve(jBQContract.address, bal, {from: user1});
    trPar = await jBQContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log(await jATContract.isAdmin(jBQContract.address));

    tx = await jBQContract.redeemTrancheAToken(2, bal, {from: user1});

    newBal = fromWei6Dec(await usdtContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " USDT.e");
    bal = await usdtTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JUA");
    console.log("User1 trA interest: "+ fromWei6Dec(newBal - oldBal) + " USDT.e");
    // console.log("CErc20 USDT.e balance: "+ fromWei(await usdtContract.methods.balanceOf(QIUSDT).call()) + " USDT.e");
    console.log("JBenQi new USDT.e balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIUSDT)) + " qiUsdt");
    console.log("BenQi TrA Value: " + fromWei(await jBQContract.getTrAValue(2)));
    console.log("BenQi total Value: " + fromWei(await jBQContract.getTotalValue(2)));
  }); 

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token usdtTrB", async function () {
    oldBal = fromWei6Dec(await usdtContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " USDT.e");
    bal = await usdtTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JUB");
    console.log("JBenQi qiUsdt balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIUSDT)) + " qiUsdt");
    tx = await usdtTrBContract.approve(jBQContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(2)));
    console.log("TrB value: " +  fromWei6Dec(await jBQContract.getTrBValue(2)));
    console.log(await jATContract.isAdmin(jBQContract.address));

    tx = await jBQContract.redeemTrancheBToken(2, bal, {from: user1});
    
    newBal = fromWei6Dec(await usdtContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " USDT.e");
    bal = await usdtTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei6Dec(bal) + " JUB");
    console.log("User1 trB interest: "+ fromWei6Dec(newBal - oldBal) + " USDT.e");
    console.log("JBenQi new USDT.e balance: "+ fromWei8Dec(await jBQContract.getTokenBalance(QIUSDT)) + " qiUsdt");
    console.log("TrA Value: " + fromWei6Dec(await jBQContract.getTrAValue(2)));
    console.log("TrB value: " +  fromWei6Dec(await jBQContract.getTrBValue(2)));
    console.log("BenQi total Value: " + fromWei6Dec(await jBQContract.getTotalValue(2)));
  }); 


});