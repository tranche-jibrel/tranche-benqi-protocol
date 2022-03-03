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

const timeMachine = require('ganache-time-traveler');

const fs = require('fs');
const DAI_ABI = JSON.parse(fs.readFileSync('./test/utils/Dai.abi', 'utf8'));
// console.log(JSON.stringify(contract.abi));

const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JBenQi = artifacts.require('JBenQi');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const QIAVAX = "0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c";
const DAIE_HOLDER = "0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8";
const DAIE_ADDRESS = "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70";
const QIDAI = "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D";

let daiContract, jFCContract, jATContract, jTrDeplContract, jBQContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());

contract("JBenQi", function (accounts) {

  it("AVAX balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("DAI.e total Supply", async function () {
    daiContract = new web3.eth.Contract(DAI_ABI, DAIE_ADDRESS);
    result = await daiContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(DAIE_HOLDER).call()) + " DAI.e");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: DAIE_HOLDER, from: user1, value: toWei('2')})
    console.log(await web3.eth.getBalance(DAIE_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await daiContract.methods.transfer(user1, toWei(10000)).send({from: DAIE_HOLDER})
    console.log("UnBlockedAccount DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(DAIE_HOLDER).call()) + " DAI.e");
    userBal = await daiContract.methods.balanceOf(user1).call();
    console.log("user1 DAI.e balance: " + fromWei(userBal) + " DAI.e");
    // expect(fromWei(userBal)).to.be.equal(new BN(10000).toString());
  });

  it("All other contracts ok", async function () {
    jFCContract = await JFeesCollector.deployed();
    expect(jFCContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jFCContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(jFCContract.address);

    jATContract = await JAdminTools.deployed();
    expect(jATContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jATContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(jATContract.address);

    jTrDeplContract = await JTranchesDeployer.deployed();
    expect(jTrDeplContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jTrDeplContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(jTrDeplContract.address);

    jBQContract = await JBenQi.deployed();
    expect(jBQContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jBQContract.address).to.match(/0x[0-9a-fA-F]{40}/);

    trParams0 = await jBQContract.trancheAddresses(0);
    ethTrAContract = await JTrancheAToken.at(trParams0.ATrancheAddress);
    expect(ethTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(ethTrAContract.address);

    ethTrBContract = await JTrancheBToken.at(trParams0.BTrancheAddress);
    expect(ethTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(ethTrBContract.address);

    trParams1 = await jBQContract.trancheAddresses(1);
    daiTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(daiTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(daiTrAContract.address);

    daiTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(daiTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(daiTrBContract.address);
  });

  it("user1 buys some token AvaxTrA", async function () {
    console.log(user1);
    console.log("User1 Eth balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    trAddresses = await jBQContract.trancheAddresses(0); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(0);
    console.log("Compound Price: " + await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5]));
    trPar = await jBQContract.trancheParameters(0);
    console.log("param tranche A: " + JSON.stringify(trPar));
    console.log("rpb tranche A: " + trPar[3].toString());
    tx = await jBQContract.calcRPBFromPercentage(0, {
      from: user1
    });
    trPar = await jBQContract.trancheParameters(0);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trPar = await jBQContract.trancheParameters(0);
    console.log("param tranche A: " + JSON.stringify(trPar));
    tx = await jBQContract.buyTrancheAToken(0,  toWei("1"), {
      from: user1,
      value: toWei("1")
    });
    console.log("User1 New AVAX balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    console.log("User1 trA tokens: " + fromWei(await ethTrAContract.balanceOf(user1)) + " ATA");
    console.log("JBenQi qiAVAX balance: " + fromWei(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    trPar = await jBQContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jBQContract.trancheAddresses(0); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(0);
    console.log("Compound Price: " + await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5]));
    trPar = await jBQContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
  });

  it("user1 buys some token AvaxTrB", async function () {
    //console.log("User1 Eth balance: "+ fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    tx = await jBQContract.buyTrancheBToken(0, toWei("1"), {
      from: user1,
      value: toWei("1")
    });
    console.log("User1 New Eth balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    console.log("User1 trB tokens: " + fromWei(await ethTrBContract.balanceOf(user1)) + " ATB");
    console.log("JBenQi qiAVAX balance: " + fromWei(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(0)));
  });

  it("user1 buys some token daiTrA", async function () {
    console.log("is Dai allowed in JBenQi: " + await jBQContract.isQiTokenAllowed(DAIE_ADDRESS));
    
    trAddresses = await jBQContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(1);
    console.log("Compound Price: " + await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5]));
    console.log("param tranche A: " + JSON.stringify(trPars));
    console.log("rpb tranche A: " + trPar[3].toString());
    tx = await jBQContract.calcRPBFromPercentage(1, {
      from: user1
    });
    trPar = await jBQContract.trancheParameters(1);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trPars = await jBQContract.trancheParameters(1);
    console.log("param tranche A: " + JSON.stringify(trPars));
    trParams = await jBQContract.trancheAddresses(1);
    expect(trParams.buyerCoinAddress).to.be.equal(DAIE_ADDRESS);
    expect(trParams.qiTokenAddress).to.be.equal(QIDAI);
    console.log("User1 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    tx = await daiContract.methods.approve(jBQContract.address, toWei(1000)).send({from: user1});
    tx = await jBQContract.buyTrancheAToken(1, toWei(1000), {from: user1});
    console.log("User1 New DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    console.log("User1 trA tokens: " + fromWei(await daiTrAContract.balanceOf(user1)) + " DTA");
    console.log("CErc20 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(QIDAI).call()) + " DAI.e");
    console.log("JBenQi DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(jBQContract.address).call()) + " DAI.e");
    console.log("JBenQi qiDAI balance: " + fromWei(await jBQContract.getTokenBalance(QIDAI)) + " qiDAI");
    trPar = await jBQContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jBQContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(1);
    console.log("Compound Price: " + await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5]));
    console.log("Compound TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("Compound total Value: " + fromWei(await jBQContract.getTotalValue(1)));
  });

  it("user1 buys some token daiTrB", async function () {
    console.log("User1 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    trAddr = await jBQContract.trancheAddresses(1);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei(await jBQContract.getTrBValue(1)));
    console.log("Compound total Value: " + fromWei(await jBQContract.getTotalValue(1)));
    console.log("TrB total supply: " + fromWei(await daiTrBContract.totalSupply()));
    console.log("Compound TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(1)));
    tx = await daiContract.methods.approve(jBQContract.address, toWei(1000)).send({from: user1});
    tx = await jBQContract.buyTrancheBToken(1, toWei(1000), {from: user1});
    console.log("User1 New DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI.e");
    console.log("User1 trB tokens: " + fromWei(await daiTrBContract.balanceOf(user1)) + " DTB");
    console.log("CErc20 DAI.e balance: " + fromWei(await daiContract.methods.balanceOf(QIDAI).call()) + " DAI.e");
    console.log("JBenQi DAI.e balance: " + fromWei(await jBQContract.getTokenBalance(QIDAI)) + " qiDAI");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(1)));
    trAddresses = await jBQContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jBQContract.trancheParameters(1);
    console.log("Compound Price: " + await jBQContract.getBenQiPrice(trAddresses[1], trPars[6], trPars[5]));
    trPar = await jBQContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("Compound TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("TrB value: " + fromWei(await jBQContract.getTrBValue(1)));
    console.log("Compound total Value: " + fromWei(await jBQContract.getTotalValue(1)));
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
    console.log("User1 Eth balance: " + oldBal + " AVAX");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " ATA");
    console.log("JBenQi qiAVAX balance: " + fromWei(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    console.log("CEther eth bal:" + fromWei(await web3.eth.getBalance(QIAVAX)));
    trPar = await jBQContract.trancheParameters(0);
    stPrice = trPar.storedTrancheAPrice * Math.pow(10, -18);
    //console.log(stPrice.toString());
    tempAmnt = bal * Math.pow(10, -18);
    //console.log(tempAmnt.toString())
    taAmount = tempAmnt * stPrice;
    console.log(taAmount);
    tx = await ethTrAContract.approve(jBQContract.address, bal, {
      from: user1
    });
    await jBQContract.redeemTrancheAToken(0, bal, {
      from: user1
    });
    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Eth balance: " + newBal + " AVAX");
    console.log("User1 trA interest: " + (newBal - oldBal) + " AVAX");
    console.log("User1 trA tokens: " + fromWei(await ethTrAContract.balanceOf(user1)) + " ATA");
    console.log("JBenQi new qiAVAX balance: " + fromWei(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    trPar = await jBQContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
  });

  it('let timeout elapsed', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 5;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI.e");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    console.log("JBenQi qiDAI balance: "+ fromWei(await jBQContract.getTokenBalance(QIDAI)) + " qiDAI");
    tx = await daiTrAContract.approve(jBQContract.address, bal, {from: user1});
    trPar = await jBQContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    tx = await jBQContract.redeemTrancheAToken(1, bal, {from: user1});
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI.e");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " DAI.e");
    console.log("CErc20 DAI.e balance: "+ fromWei(await daiContract.methods.balanceOf(QIDAI).call()) + " DAI.e");
    console.log("JBenQi new DAI.e balance: "+ fromWei(await jBQContract.getTokenBalance(QIDAI)) + " qiDAI");
    console.log("Compound TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("Compound total Value: " + fromWei(await jBQContract.getTotalValue(1)));
  }); 

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token AvaxTrB", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 Eth balance: " + oldBal + " AVAX");
    bal = await ethTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " ATB");
    console.log("JBenQi qiAVAX balance: " + fromWei(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(0)));
    tx = await ethTrBContract.approve(jBQContract.address, bal, {
      from: user1
    });
    await jBQContract.redeemTrancheBToken(0, bal, {
      from: user1
    });
    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Eth balance: " + newBal + " AVAX");
    console.log("User1 trB interest: " + (newBal - oldBal) + " AVAX");
    console.log("User1 trB tokens: " + fromWei(await ethTrAContract.balanceOf(user1)) + " ATB");
    console.log("JBenQi new qiAVAX balance: " + fromWei(await jBQContract.getTokenBalance(QIAVAX)) + " qiAVAX");
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(0)));
  });

  it('let timeout elapsed', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 5;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });
  
  it("user1 redeems token daiTrB", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI.e");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("JBenQi qiDAI balance: "+ fromWei(await jBQContract.getTokenBalance(QIDAI)) + " qiDAI");
    tx = await daiTrBContract.approve(jBQContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jBQContract.getTrancheBExchangeRate(1)));
    console.log("TrB value: " +  fromWei(await jBQContract.getTrBValue(1)));
    tx = await jBQContract.redeemTrancheBToken(1, bal, {from: user1});
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI.e");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " DAI.e");
    console.log("CErc20 DAI.e balance: "+ fromWei(await daiContract.methods.balanceOf(QIDAI).call()) + " DAI.e");
    console.log("JBenQi new DAI.e balance: "+ fromWei(await jBQContract.getTokenBalance(QIDAI)) + " qiDAI");
    console.log("TrA Value: " + fromWei(await jBQContract.getTrAValue(1)));
    console.log("TrB value: " +  fromWei(await jBQContract.getTrBValue(1)));
    console.log("Compound total Value: " + fromWei(await jBQContract.getTotalValue(1)));
  }); 

});