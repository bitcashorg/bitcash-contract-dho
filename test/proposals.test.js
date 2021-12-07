const { rpc } = require('../scripts/eos')
const { getContracts, createRandomAccount, Asset } = require('../scripts/eosio-util')
const { assertError } = require('../scripts/eosio-errors')
const { contractNames, contracts: configContracts, isLocalNode, sleep } = require('../scripts/config')
const { ProposalsFactory } = require('./util/ProposalsUtil')
const { TokenUtil } = require('./util/TokenUtil')
const { EnvironmentUtil } = require('./util/EnvironmentUtil')
const { ConfigPhasesBuilder, ConfigEngineer } = require('./util/ConfigUtil')

const expect = require('chai').expect

const { proposals, token } = contractNames


describe('Tests for proposals', async function () {

  let contracts

  before(async function () {
    if (!isLocalNode()) {
      console.log('These tests should only be run on a local node')
      process.exit(1)
    }
  })

  beforeEach(async function () {
    await EnvironmentUtil.initNode()
    await sleep(4000)
    await EnvironmentUtil.deployContracts(configContracts)

    contracts = await getContracts([proposals, token])

    await TokenUtil.create({ 
      issuer: token, 
      maxSupply: `1000000000000.0000 ${TokenUtil.tokenCode}`,
      contractAccount: token,
      contract: contracts.token
    })
  })

  afterEach(async function () {
    await EnvironmentUtil.killNode()
  })

  it.only('An account with enough balance can create a main proposal', async function () {

    // Arrange
    const configBuilder = new ConfigPhasesBuilder(contracts.proposals, proposals)
    const configEngineer = new ConfigEngineer(configBuilder)
    await configEngineer.execute({})

    const proposal = await ProposalsFactory.createMainWithDefaults({})

    // Act
    await contracts.proposals.create(proposal.getActionParams(), { authorization: `${proposal.params.creator}@active` })

    // Assert
    const proposalsTable = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'proposals',
      json: true
    })
    console.log(JSON.stringify(proposalsTable, null, 4))

  })

})