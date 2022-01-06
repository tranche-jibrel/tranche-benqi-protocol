const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*"
    },
    fuji: {
      networkCheckTimeout: 1000000,
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://avalanche--fuji--rpc.datahub.figment.io/apikey/${process.env.FIGMENT_KEY}/ext/bc/C/rpc`
        ),
      network_id: 42,
      gas: 6721975,
      gasPrice: 161000000000,
      confirmations: 2,
      timeoutBlocks: 2000,
      skipDryRun: true
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://avalanche--mainnet--rpc.datahub.figment.io/apikey/${process.env.FIGMENT_KEY}/ext/bc/C/rpc`
        ),
      network_id: 43114,
      gas: 8000000,
      gasPrice: 161000000000,
      timeoutBlocks: 200,
      confirmations: 2,
      skipDryRun: true
    },
    avaxtest: {
      provider: function () {
        return new HDWalletProvider({ privateKeys: [process.env.mnemonic], providerOrUrl: process.env.PROVIDER, chainId: "0xa869" })
      },
      gas: 6000000,
      gasPrice: 225000000000,
      network_id: "*",
      confirmations: 2,
      skipDryRun: true
    },
    avaxmainnet: {
      provider: function () {
        return new HDWalletProvider({ privateKeys: [process.env.mnemonic], providerOrUrl: process.env.PROVIDER, chainId: "0xa86a" })
      },
      gas: 5000000,
      gasPrice: 50000000000,
      network_id: "*",
      confirmations: 2,
      skipDryRun: true
    },
  },
  plugins: ['truffle-contract-size',
    'solidity-coverage',
    'truffle-plugin-verify',
  ],
  // Set default mocha options here, use special reporters etc.
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: "USD",
      coinmarketcap: `${process.env.CMC_API_KEY}`
    },
    timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.8",    // Fetch exact version from solc-bin (default: truffle's version)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
        //evmVersion: "byzantium"
      }
    }
  },
  db: {
    enabled: false
  },
  api_keys: {
    etherscan: `${process.env.ETHERSCAN_KEY}`,
    bscscan: `${process.env.BSCSCAN_KEY}`,
    snowtrace: `${process.env.SNOWTRACE_KEY}`,
    polygonscan: `${process.env.POLYGONSCAN_KEY}`,
    ftmscan: `${process.env.FTMSCAN_KEY}`,
    hecoinfo: `${process.env.HECOINFO_KEY}`,
    moonscan: `${process.env.MOONSCAN_KEY}`
  }
};
