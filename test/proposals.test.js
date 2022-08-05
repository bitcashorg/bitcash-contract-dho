const { rpc } = require('../scripts/eos')
const { getContracts, createRandomAccount, Asset, formatTimePoint } = require('../scripts/eosio-util')
const { assertError } = require('../scripts/eosio-errors')
const { contractNames, contracts: configContracts, isLocalNode, sleep } = require('../scripts/config')
const { ProposalsFactory } = require('./util/ProposalsUtil')
const { TokenUtil } = require('./util/TokenUtil')
const { EnvironmentUtil } = require('./util/EnvironmentUtil')
const { ConfigPhasesBuilder, ConfigGeneralBuilder, ConfigEngineer } = require('./util/ConfigUtil')
const { ReferendumConstants } = require('./util/ReferendumsUtil')

const expect = require('chai').expect

const { proposals, token, referendums } = contractNames



async function passReferendum (contracts, proposalId) {
  const amounts = [100000, 50000]

  const proposalsTable = await rpc.get_table_rows({
    code: proposals,
    scope: proposals,
    table: 'proposals',
    json: true
  })

  const proposal = proposalsTable.rows.filter(r => r.proposal_id === proposalId)[0]
  let referendumId = 0

  for (let i = proposal.special_attributes.length - 1; i >= 0; i--) {
    const { key, value } = proposal.special_attributes[i]

    if (key.includes('referendum_id')) {
      referendumId = value[1]
      break
    }
  }

  console.log('referendum found:', referendumId)

  if (referendumId === 0) return

  for (let i = 0; i < amounts.length; i++) {
    const voter = await createRandomAccount()

    const assetAmount = new Asset(amounts[i], TokenUtil.tokenCode, TokenUtil.tokenPrecision)
    await TokenUtil.issue({ amount: assetAmount.toString(), issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, voter, assetAmount.toString(), '', { authorization: `${token}@active` })

    await contracts.referendums.vote(referendumId, voter, ReferendumConstants.VoteFavour, { authorization: `${voter}@active` })
  }

  await contracts.referendums.finish(referendumId, { authorization: `${referendums}@active` })
}



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
    await EnvironmentUtil.updatePermissions()

    contracts = await getContracts([proposals, token, referendums])

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
/*
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
*/
  const phasesTests = [
    {
      testDescription: 'The main proposal can move from debate to debatevoting',
      data: {
        from: 'debate',
        to: 'debatevoting'
      }
    },
    {
      testDescription: 'The main proposal can move from debatevoting to propvoting',
      data: {
        from: 'debatevoting',
        to: 'propvoting'
      }
    },
    {
      testDescription: 'The main proposal can finish propvoting and change status to accepted',
      data: {
        from: 'propvoting',
        to: ''
      }
    }
  ]

  phasesTests.forEach(({ testDescription, data }, index) => {

    it.only(testDescription, async function () {

      // Arrange
      const phasesConfig = require('./examples/phasesConfig.json')
      const mainPhasesConfig = phasesConfig.main

      const NO_CHECKING_FOR_DURATION_DAYS = -1

      const phases = mainPhasesConfig.map(pc => {
        return {
          ...pc,
          durationDays: NO_CHECKING_FOR_DURATION_DAYS
        }
      })

      const proposal = await ProposalsFactory.createMainWithDefaults({
        phases
      })
  
      const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
      const configUtil = await configEngineerGeneral.execute({})
  
      const minstake = configUtil.config['main']['minstake'][1]
  
      await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
      await contracts.token.transfer(token, proposal.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })
      
      await contracts.proposals.create(proposal.getActionParams(), { authorization: `${proposal.params.creator}@active` })


      for (let i = 0; i < index-1; i++) {
        await passReferendum(contracts, 1)
        await contracts.proposals.move(1, { authorization: `${proposal.params.creator}@active` })
      }

      await passReferendum(contracts, 1)
  
  
      // Act
      // await contracts.proposals.move(1, { authorization: `${proposal.params.creator}@active` })
  
  
      // Assert
      const proposalsTable = await rpc.get_table_rows({
        code: proposals,
        scope: proposals,
        table: 'proposals',
        json: true
      })
      console.table(JSON.stringify(proposalsTable, null, 4))

      const referendumsTable = await rpc.get_table_rows({
        code: referendums,
        scope: referendums,
        table: 'referendums',
        json: true
      })
      console.log(JSON.stringify(referendumsTable, null, 4))
  
    })

  })

})