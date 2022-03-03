# BenQi Tranche Protocol

<img src="https://gblobscdn.gitbook.com/spaces%2F-MP969WsfbfQJJFgxp2K%2Favatar-1617981494187.png?alt=media" alt="Tranche Logo" width="100">

BenQi Tranche is a decentralized protocol for managing risk and maximizing returns. The protocol integrates with BenQi's qiTokens, to create two new interest-bearing instruments, one with a fixed-rate, Tranche A, and one with a variable rate, Tranche B. 

Info URL: https://docs.tranche.finance/tranchefinance/

## Development

### Install Dependencies

```bash
npm i
```

### Compile project

```bash
truffle compile --all
```

### Run test

```bash
truffle run test
```

### Code Coverage

```bash
truffle run coverage
```

or to test a single file:

```bash
truffle run coverage --network development --file="<filename>"   
```

Test coverage on JYearn contract: 94.41%

[(Back to top)](#BenQi-Tranche-Protocol)

## Tranche BenQi Protocol Usage

Please refer to ./migrations/1_deploy_contracts.js file to see how the system could be deployed on the blockchain

Users can now call buy and redeem functions for tranche A & B tokens.

SIR methods can be used to incentivize tranche return with rewards.

Note: if AVAX tranche is deployed, please deploy AVAXGateway contract without a proxy, then set its address in JBenQi with setAVAXGateway function.

[(Back to top)](#BenQi-Tranche-Protocol)

### Test Coverage

<table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Test %</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
        <tr>
            <td>AVAXGateway</td>
            <td><code>70.83%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JAdminTools</td>
            <td><code>57.89%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JBenQi</td>
            <td><code>80%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JFeesCollector</td>
            <td><code>6.25%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JTrancheTokens</td>
            <td><code>100%</code></td>
            <td>---</td>
        </tr>
    </tbody>
  </table>

[(Back to top)](#BenQi-Tranche-Protocol)

## Main contracts - Name, Size and Description

<table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Size (KiB)</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
        <tr>
            <td>AVAXGateway</td>
            <td><code>3.39</code></td>
            <td>Avalanche coins gateway, useful when dealing with AVAX. Not upgradeable.</td>
        </tr>
        <tr>
            <td>JAdminTools</td>
            <td><code>2.27</code></td>
            <td>Contract for administrative roles control (implementation), allowing the identification of addresses when dealing with reserved methods. Upgradeable.</td>
        </tr>
        <tr>
            <td>JAdminToolsStorage</td>
            <td><code>0.72</code></td>
            <td>Contract for administrative roles control (storage)</td>
        </tr>
        <tr>
            <td>JBenQi</td>
            <td><code>17.96</code></td>
            <td>Core contract protocol (implementation). It is responsible to make all actions to give the exact amount of tranche token to users, connecting with BenQi to have interest rates and other informations to give tokens the price they should have block by block. It also opens new tranches, and, via Tranche Deployer contract, it deploys new tranche tokens. Upgradeable.</td>
        </tr>
        <tr>
            <td>JBenQiStorageV2</td>
            <td><code>1.94</code></td>
            <td>Core contract protocol (storage)</td>
        </tr>
        <tr>
            <td>JFeesCollector</td>
            <td><code>9.11</code></td>
            <td>Fees collector and uniswap swapper (implementation), it changes all fees and extra tokens into new interests for token holders, sending back extra mount to Compound protocol contract. Upgradeable.</td>
        </tr>
        <tr>
            <td>JFeesCollectorStorage</td>
            <td><code>0.82</code></td>
            <td>Fees collector and uniswap swapper (storage)</td>
        </tr>
        <tr>
            <td>JTrancheAToken</td>
            <td><code>5.52</code></td>
            <td>Tranche A token, with a non decreasing price, making possible for holders to have a fixed interest percentage. Not upgradeable.</td>
        </tr>
        <tr>
            <td>JTrancheBToken</td>
            <td><code>5.52</code></td>
            <td>Tranche B token, with a floating price, making possible for holders to have a variable interest percentage. Not upgradeable.</td>
        </tr>
        <tr>
            <td>JTranchesDeployer</td>
            <td><code>15.82</code></td>
            <td>Tranche A & B token deployer (implementation): this contract deploys tranche tokens everytime a new tranche is opened by the core protocol contract. Upgradeable.</td>
        </tr>
        <tr>
            <td>JTranchesDeployerStorage</td>
            <td><code>0.17</code></td>
            <td>Tranche A & B token deployer (storage)</td>
        </tr>
    </tbody>
  </table>

  [(Back to top)](#BenQi-Tranche-Protocol)
