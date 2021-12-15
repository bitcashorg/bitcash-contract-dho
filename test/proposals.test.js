const { rpc } = require('../scripts/eos')
const { getContracts, createRandomAccount, Asset, formatTimePoint } = require('../scripts/eosio-util')
const { assertError } = require('../scripts/eosio-errors')
const { contractNames, contracts: configContracts, isLocalNode, sleep } = require('../scripts/config')
const { ProposalsFactory } = require('./util/ProposalsUtil')
const { TokenUtil } = require('./util/TokenUtil')
const { EnvironmentUtil } = require('./util/EnvironmentUtil')
const { ConfigPhasesBuilder, ConfigGeneralBuilder, ConfigEngineer } = require('./util/ConfigUtil')

const expect = require('chai').expect

const { proposals, token } = contractNames


describe('Tests for main proposals', async function () {

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

    const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
    await configEngineerGeneral.execute({})

    const configEngineerPhases = new ConfigEngineer(new ConfigPhasesBuilder(contracts.proposals, proposals))
    await configEngineerPhases.execute({})
  })

  afterEach(async function () {
    await EnvironmentUtil.killNode()
  })

  it('An account with enough balance can create a main proposal', async function () {

    // Arrange
    const proposal = await ProposalsFactory.createMainWithDefaults({})

    const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
    const configUtil = await configEngineerGeneral.execute({})

    const minstake = configUtil.config['main']['minstake'][1]

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, proposal.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })


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

  it('An account with not enough balance can not create a main proposal', async function () {

    // Arrange
    const proposal = await ProposalsFactory.createMainWithDefaults({})

    const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
    const configUtil = await configEngineerGeneral.execute({})

    const minstake = configUtil.config['main']['minstake'][1]

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, proposal.params.creator, '10.0000 BANK', 'initial supply for creating a proposal', { authorization: `${token}@active` })

    let error = {}

    // Act
    try {
      await contracts.proposals.create(proposal.getActionParams(), { authorization: `${proposal.params.creator}@active` })
    } catch (err) {
      error = err
    }

    // Assert
    assertError({
      error,
      textInside: 'minimum required balance to create this proposal is',
      verbose: false
    })

  })

  it("The proposal's owner can update the main proposal if it is in discussion phase", async function () {

    // Arrange
    const proposal = await ProposalsFactory.createMainWithDefaults({})

    const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
    const configUtil = await configEngineerGeneral.execute({})

    const minstake = configUtil.config['main']['minstake'][1]

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, proposal.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })

    await contracts.proposals.create(proposal.getActionParams(), { authorization: `${proposal.params.creator}@active` })

    const d = new Date()
    d.setDate(d.getDate() + 40)

    let budget = new Asset(5000000, TokenUtil.tokenCode, TokenUtil.tokenPrecision)
    budget = budget.toString()

    const updatedFields = {
      proposalId: 1,
      creator: proposal.params.creator,
      title: 'updated title',
      description: 'updated description',
      kpi: 'updated kpis',
      deadline: formatTimePoint(d),
      budget
    }

    const proposalUpdated = await ProposalsFactory.createMainWithDefaults(updatedFields)


    // Act
    await contracts.proposals.update(proposalUpdated.getActionParams(), { authorization: `${proposalUpdated.params.creator}@active` })


    // Assert
    const proposalsTable = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'proposals',
      json: true
    })
    console.log(JSON.stringify(proposalsTable, null, 4))

  })

  it("The proposal's owner can cancel the main proposal if it is in discussion phase", async function () {

    // Arrange
    const proposal = await ProposalsFactory.createMainWithDefaults({})

    const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
    const configUtil = await configEngineerGeneral.execute({})

    const minstake = configUtil.config['main']['minstake'][1]

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, proposal.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })

    await contracts.proposals.create(proposal.getActionParams(), { authorization: `${proposal.params.creator}@active` })


    // Act
    await contracts.proposals.cancel(1, { authorization: `${proposal.params.creator}@active` })


    // Assert
    const proposalsTable = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'proposals',
      json: true
    })
    
    expect(proposalsTable.rows).to.be.empty

  })

})