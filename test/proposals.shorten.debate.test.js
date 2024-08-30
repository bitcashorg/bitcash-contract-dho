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



async function passReferendum(contracts, proposalId) {
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



describe('Tests for shorten debate proposals', async function () {

  let contracts

  let main_proposal, minstake

  before(async function () {
    if (!isLocalNode()) {
      console.log('These tests should only be run on a local node')
      process.exit(1)
    }
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


    // create a global main proposal to test

    main_proposal = await ProposalsFactory.createMainWithDefaults({})

    const configUtil = await configEngineerGeneral.execute({})

    minstake = configUtil.config['main']['minstake'][1]

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, main_proposal.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })


    await contracts.proposals.create(main_proposal.getActionParams(), { authorization: `${main_proposal.params.creator}@active` })




  })

  afterEach(async function () {
    await EnvironmentUtil.killNode()
  })
  /*
    it('An account can not create an shorten dabate when main proposal is not on debate phase', async function () {
      
      // Arrange
      await contracts.proposals.move(1, { authorization: `${main_proposal.params.creator}@active` })
      const proposal_shorten_debate = await ProposalsFactory.createShortenDebateWithDefaults({})
  
      await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
      await contracts.token.transfer(token, proposal_shorten_debate.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })
  
      // Act
      try {
        await contracts.proposals.create(proposal_shorten_debate.getActionParams(), { authorization: `${proposal_shorten_debate.params.creator}@active` })
      } catch (err) {
        error = err
      }
  
      // Assert
      assertError({
        error,
        textInside: 'shorten debate proposal can be only created when main proposal is on debate phase',
        verbose: false
      })
        
  
    })
  */
  it('An account can create an shorten debate when main proposal is on debate phase', async function () {

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

    console.log(phases)


    await passReferendum(contracts, 1)

    const proposal_shorten_debate = await ProposalsFactory.createShortenDebateWithDefaults({})

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, proposal_shorten_debate.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })


    await contracts.proposals.create(proposal_shorten_debate.getActionParams(), { authorization: `${proposal_shorten_debate.params.creator}@active` })


    // Assert
    const proposalsTable = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'proposals',
      json: true
    })
    console.log(JSON.stringify(proposalsTable, null, 4))



  })

  it('An account moves his shorten debate to discuss (main proposal get an awaiting)', async function () {

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

    console.log(phases)


    await passReferendum(contracts, 1)

    const proposal_shorten_debate = await ProposalsFactory.createShortenDebateWithDefaults({})

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, proposal_shorten_debate.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })

    // Act
    await contracts.proposals.create(proposal_shorten_debate.getActionParams(), { authorization: `${proposal_shorten_debate.params.creator}@active` })

    // Assert
    const proposalsTable = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'proposals',
      json: true
    })
    console.log(JSON.stringify(proposalsTable, null, 4))



  })


  it('Main proposal can not be moved while there is an active shorten dabate', async function () {

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

    console.log(phases)


    await passReferendum(contracts, 1)

    const proposal_shorten_debate = await ProposalsFactory.createShortenDebateWithDefaults({})

    await TokenUtil.issue({ amount: minstake, issuer: token, contract: contracts.token })
    await contracts.token.transfer(token, proposal_shorten_debate.params.creator, minstake, 'initial supply for creating a proposal', { authorization: `${token}@active` })


    await contracts.proposals.create(proposal_shorten_debate.getActionParams(), { authorization: `${proposal_shorten_debate.params.creator}@active` })

    // Act
    try {
      await contracts.proposals.move(1, { authorization: `${main_proposal.params.creator}@active` })
    } catch (err) {
      error = err
    }

    // Assert
    assertError({
      error,
      textInside: 'phase is not ready to end',
      verbose: false
    })

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