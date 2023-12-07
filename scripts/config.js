require('dotenv').config()

const devKey = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'

const contract = (name, nameOnChain) => {
  return {
    name,
    nameOnChain,
    type: 'contract',
    stakes: {
      cpu: '1.0000 EOS',
      net: '1.0000 EOS',
      ram: 1000000
    }
  }
}

const supportedChains = {
  local: 'local',
  telosTestnet: 'telosTestnet',
  telosMainnet: 'telosMainnet',
  jungleTestnet: 'jungleTestnet',
  eosMainnet: 'eosMainnet'
}

const contractsConfig = {
  [supportedChains.local]: [
    contract('nullcontract', 'm1nullcntrct'),
    contract('referendums', 'eospropvotes'),
    contract('proposals', 'eosmakeprops'),
    contract('token', 'eosio.token')
  ],
  [supportedChains.jungleTestnet]: [
    contract('referendums', 'referendums1'),
    contract('proposals', 'tlaproposals'),
    contract('token', 'tlatesttoken')
  ],
  [supportedChains.telosTestnet]: [
    contract('referendums', 'referendums1'),
    contract('proposals', 'tlaproposals'),
    contract('token', 'tlatesttoken')
  ],
  [supportedChains.telosTestnet]: [
    contract('referendums', 'testrefendum'),
    contract('proposals', 'testproposal'),
  ],
  [supportedChains.eosMainnet]: [
    // contract('referendums', 'eospropvotes'),
    // contract('proposals', 'eosmakeprops')
    contract('proposals', 'testproposal'),
    contract('referendums', 'testrefendum'),
  ]
}

const ownerByChain = {
  [supportedChains.local]: 'eosio',
  [supportedChains.jungleTestnet]: 'tlalocman123',
  [supportedChains.telosTestnet]: 'tlaclocmant2',
  [supportedChains.eosMainnet]: 'erick.bk'
}

const ownerPublicKeys = {
  owner: process.env.PUBLIC_KEY,
  active: process.env.PUBLIC_KEY
}

const chain = process.env.CHAIN_NAME

const owner = ownerByChain[chain]
const publicKeys = ownerPublicKeys
const contracts = contractsConfig[chain]
const contractNames = {}
const nameOnChainToName = {}

for (const c of contracts) {
  contractNames[c.name] = c.nameOnChain
  nameOnChainToName[c.nameOnChain] = c.name
}

const permissionsConfig = [
  {
    target: `${contractNames.referendums}@active`,
    actor: `${contractNames.referendums}@eosio.code`
  },
  {
    target: `${contractNames.proposals}@active`,
    actor: `${contractNames.proposals}@eosio.code`
  },
  {
    target: `${contractNames.referendums}@active`,
    actor: `${contractNames.proposals}@active`
  }
]

function isLocalNode() {
  return chain == supportedChains.local
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  contracts, contractNames, nameOnChainToName, owner, ownerPublicKeys, publicKeys,
  isLocalNode, sleep, chain, permissionsConfig, devKey
}
