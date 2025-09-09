require("dotenv").config();

const devKey = "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV";

const contract = (name, nameOnChain) => {
  return {
    name,
    nameOnChain,
    type: "contract",
    stakes: {
      cpu: "1.0000 IMPACT",
      net: "1.0000 IMPACT",
      ram: 1000000,
    },
  };
};

const supportedChains = {
  local: "local",
  telosTestnet: "telosTestnet",
  telosMainnet: "telosMainnet",
  jungleTestnet: "jungleTestnet",
  eosMainnet: "eosMainnet",
  layer1: "layer1",
};

// Network-specific endpoints with environment variable overrides
const endpointsByChain = {
  [supportedChains.local]: process.env.LOCAL_ENDPOINT || process.env.ENDPOINT || "http://127.0.0.1:8888",
  [supportedChains.jungleTestnet]: process.env.JUNGLE_TESTNET_ENDPOINT || "https://jungle4.api.eosnation.io",
  [supportedChains.telosTestnet]: process.env.TELOS_TESTNET_ENDPOINT || "https://testnet.telos.net",
  [supportedChains.telosMainnet]: process.env.TELOS_MAINNET_ENDPOINT || "https://mainnet.telos.net",
  [supportedChains.eosMainnet]: process.env.EOS_MAINNET_ENDPOINT || "https://api.eosn.io",
  [supportedChains.layer1]: process.env.LAYER1_ENDPOINT || "https://api.np.animus.is",
};

// Get contract names from environment variables or use defaults
const getContractName = (envVar, defaultValue) => {
  return process.env[envVar] || defaultValue;
};

const contractsConfig = {
  [supportedChains.local]: [
    contract("nullcontract", "m1nullcntrct"),
    contract("referendums", getContractName("REFERENDUMS_ACCOUNT", "eospropvotes")),
    contract("proposals", getContractName("PROPOSALS_ACCOUNT", "eosmakeprops")),
    contract("token", getContractName("TOKEN_ACCOUNT", "eosio.token")),
  ],
  [supportedChains.jungleTestnet]: [
    contract("referendums", getContractName("REFERENDUMS_ACCOUNT", "referendums1")),
    contract("proposals", getContractName("PROPOSALS_ACCOUNT", "tlaproposals")),
    contract("token", getContractName("TOKEN_ACCOUNT", "tlatesttoken")),
  ],
  [supportedChains.telosTestnet]: [
    contract("referendums", getContractName("REFERENDUMS_ACCOUNT", "referendums1")),
    contract("proposals", getContractName("PROPOSALS_ACCOUNT", "tlaproposals")),
    contract("token", getContractName("TOKEN_ACCOUNT", "tlatesttoken")),
  ],
  [supportedChains.telosMainnet]: [
    contract("referendums", getContractName("REFERENDUMS_ACCOUNT", "refe.bitcash")),
    contract("proposals", getContractName("PROPOSALS_ACCOUNT", "prop.bitcash")),
    contract("token", getContractName("TOKEN_ACCOUNT", "eosio.token")),
  ],
  [supportedChains.layer1]: [
    contract("referendums", getContractName("REFERENDUMS_ACCOUNT", "refe.bitcash")),
    contract("proposals", getContractName("PROPOSALS_ACCOUNT", "prop.bitcash")),
    contract("token", getContractName("TOKEN_ACCOUNT", "eosio.token")),
  ],
  [supportedChains.eosMainnet]: [
    contract("referendums", getContractName("REFERENDUMS_ACCOUNT", "eospropvotes")),
    contract("proposals", getContractName("PROPOSALS_ACCOUNT", "eosmakeprops")),
    contract("token", getContractName("TOKEN_ACCOUNT", "eosio.token")),
  ],
};

const ownerByChain = {
  [supportedChains.local]: "eosio",
  [supportedChains.jungleTestnet]: "tlalocman123",
  [supportedChains.telosTestnet]: "tlaclocmant2",
  [supportedChains.telosMainnet]: process.env.OWNER_ACCOUNT || "eosio",
  [supportedChains.layer1]: process.env.OWNER_ACCOUNT || "eosio",
  [supportedChains.eosMainnet]: "erick.bk",
};

const ownerPublicKeys = {
  owner: process.env.PUBLIC_KEY,
  active: process.env.PUBLIC_KEY,
};

const chain = process.env.CHAIN_NAME;
const endpoint = endpointsByChain[chain];

const owner = ownerByChain[chain];
const publicKeys = ownerPublicKeys;
const contracts = contractsConfig[chain];
const contractNames = {};
const nameOnChainToName = {};

for (const c of contracts) {
  contractNames[c.name] = c.nameOnChain;
  nameOnChainToName[c.nameOnChain] = c.name;
}

const permissionsConfig = [
  {
    target: `${contractNames.referendums}@active`,
    actor: `${contractNames.referendums}@eosio.code`,
  },
  {
    target: `${contractNames.proposals}@active`,
    actor: `${contractNames.proposals}@eosio.code`,
  },
  {
    target: `${contractNames.referendums}@active`,
    actor: `${contractNames.proposals}@active`,
  },
];

function isLocalNode() {
  return chain == supportedChains.local;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  contracts,
  contractNames,
  nameOnChainToName,
  owner,
  ownerPublicKeys,
  publicKeys,
  isLocalNode,
  sleep,
  chain,
  endpoint,
  permissionsConfig,
  devKey,
};
