const { rpc } = require('../scripts/eos')
const { getContracts, createRandomAccount, Asset } = require('../scripts/eosio-util')
const { assertError } = require('../scripts/eosio-errors')
const { contractNames, contracts: configContracts, isLocalNode, sleep } = require('../scripts/config')
const { ReferendumsFactory, ReferendumConstants } = require('./util/ReferendumsUtil')
const { TokenUtil } = require('./util/TokenUtil')
const { EnvironmentUtil } = require('./util/EnvironmentUtil')

const expect = require('chai').expect

const { referendums, token } = contractNames

const createFailCases = (() => {
  const now = new Date()
  now.setHours(now.getHours() + 1)

  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  const tomorrow = new Date()
  tomorrow.setDate(now.getDate() + 1)

  return [
    {
      testName: 'Referendum with an end date smaller than the start date is invalid',
      data: { startDate: now, endDate: yesterday },
      expectedErrorMsg: 'end date must be greater or equal than the start date'
    },
    {
      testName: 'Referendum with a start date in the past is invalid',
      data: { startDate: yesterday, endDate: tomorrow },
      expectedErrorMsg: 'can not create a referendum in the past'
    },
    {
      testName: 'Day percentage configs must have at least one entry',
      data: { majorityConfig: [] },
      expectedErrorMsg: 'must have at least one entry'
    },
    {
      testName: 'Quorum config\'s start days in decreasing order are invalid',
      data: { quorumConfig: [{ start_day: 10, percentage: 5500 }, { start_day: 0, percentage: 2532 }] },
      expectedErrorMsg: 'start dates must be in increasing order'
    },
    {
      testName: 'Quorum config\'s percentages in increasing order are invalid',
      data: { quorumConfig: [{ start_day: 0, percentage: 5500 }, { start_day: 20, percentage: 7500 }] },
      expectedErrorMsg: 'percentages must be in decreasing order'
    }
  ]
})()


describe('Tests for referendums', async function () {

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

    contracts = await getContracts([referendums, token])

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


  it('Creates a new referendum', async function () {

    // Arrange
    const referendum = await ReferendumsFactory.createWithDefaults({})
    const actionParams = referendum.getActionParams()

    // Act
    await contracts.referendums.create(...actionParams, { authorization: `${referendums}@active` })

    // Assert
    const referendumTables = await rpc.get_table_rows({
      code: referendums,
      scope: referendums,
      table: 'referendums',
      json: true
    })

    expect(referendumTables.rows).to.deep.equals([{
      referendum_id: 1,
      creator: referendum.params.creator,
      start_date: actionParams[2],
      end_date: actionParams[3],
      quorum_config: [{ start_day: 0, percentage: 5500 }, { start_day: 10, percentage: 2532 }],
      majority_config: [{ start_day: 0, percentage: 8500 }],
      status: ReferendumsFactory.Status().created,
      vote_tally: [
        { key: 'abstain', value: '0.0000 BANK' },
        { key: 'no', value: '0.0000 BANK' },
        { key: 'yes', value: '0.0000 BANK' }
      ]
    }])

  })

  createFailCases.forEach(({ testName, data, expectedErrorMsg }) => {
    it(testName, async function () {

      // Arrange
      let fail
      let error

      const referendum = await ReferendumsFactory.createWithDefaults({ ...data })
      const actionParams = referendum.getActionParams()

      // Act
      try {
        await contracts.referendums.create(...actionParams, { authorization: `${referendums}@active` })
        fail = false
      } catch (err) {
        fail = true
        error = err
      }

      // Assert
      expect(fail).to.be.true
      assertError({ error, textInside: expectedErrorMsg, verbose: false })

    })
  })

  it('Referendum can be started after its creation', async function () {

    // Arrange
    const now = new Date()
    now.setMilliseconds(now.getMilliseconds() + 500)

    const referendum = await ReferendumsFactory.createWithDefaults({ startDate: now })
    const actionParams = referendum.getActionParams()

    await contracts.referendums.create(...actionParams, { authorization: `${referendums}@active` })

    await sleep(1000)

    // Act
    await contracts.referendums.start(referendum.params.referendumId, { authorization: `${referendum.params.creator}@active` })

    // Assert
    const referendumTables = await rpc.get_table_rows({
      code: referendums,
      scope: referendums,
      table: 'referendums',
      json: true
    })

    expect(referendumTables.rows[0]).to.include({ status: ReferendumsFactory.Status().started })

  })

  const voteSuccessfulCases = [
    { testName: 'Referendum in started status can be voted (favour)', option: ReferendumConstants.VoteFavour },
    { testName: 'Referendum in started status can be voted (against)', option: ReferendumConstants.VoteAgainst },
    { testName: 'Referendum in started status can be voted (abstain)', option: ReferendumConstants.VoteAbstain }
  ]
  voteSuccessfulCases.forEach(({ testName, option }) => {
    it(testName, async function () {

      // Arrange
      const now = new Date()
      now.setMilliseconds(now.getMilliseconds() + 500)
  
      const referendum = await ReferendumsFactory.createWithDefaults({ startDate: now })
      const actionParams = referendum.getActionParams()
  
      await contracts.referendums.create(...actionParams, { authorization: `${referendums}@active` })
      await sleep(1000)
      await contracts.referendums.start(referendum.params.referendumId, { authorization: `${referendum.params.creator}@active` })

      const voter = await createRandomAccount()
      const amount = new Asset(10000, TokenUtil.tokenCode, TokenUtil.tokenPrecision)

      await TokenUtil.issue({ amount: amount.toString(), issuer: token, contract: contracts.token })
      await contracts.token.transfer(token, voter, amount.toString(), 'initial supply for start voting', { authorization: `${token}@active` })

      // Act
      await contracts.referendums.vote(referendum.params.referendumId, voter, option, { authorization: `${voter}@active` })

      // Assert
      const referendumTables = await rpc.get_table_rows({
        code: referendums,
        scope: referendums,
        table: 'referendums',
        json: true
      })

      const optionVoteTally = referendumTables.rows[0].vote_tally.filter(vt => vt.key === option)

      expect(optionVoteTally).to.not.be.empty
      expect(optionVoteTally[0]).to.deep.equals({ key: option, value: amount.toString() })

      const voteTables = await rpc.get_table_rows({
        code: referendums,
        scope: referendum.params.referendumId,
        table: 'votes',
        json: true
      })

      expect(voteTables.rows).to.deep.equals([{
        voter,
        amount: amount.toString(),
        option,
        weight: 10000
      }])

    })
  })


  // test only one vote
  // test not balance entry
  // test invalid option
  // test balance must be greater than zero


  it('Referendum can be accepted after finishing voting period if it has enough favour votes', async function () {

    // Arrange
    const now = new Date()
    now.setMilliseconds(now.getMilliseconds() + 500)

    const referendum = await ReferendumsFactory.createWithDefaults({ 
      startDate: now,
      quorumConfig: [{ start_day: 0, percentage: 8500 }],
      majorityConfig: [{ start_day: 0, percentage: 5500 }]
    })
    const actionParams = referendum.getActionParams()

    await contracts.referendums.create(...actionParams, { authorization: `${referendums}@active` })
    await sleep(1000)
    await contracts.referendums.start(referendum.params.referendumId, { authorization: `${referendum.params.creator}@active` })

    const amounts = [100000, 50000, 30000, 20000]
    const votingOrder = [ReferendumConstants.VoteFavour, ReferendumConstants.VoteAgainst, 
      ReferendumConstants.VoteAgainst, ReferendumConstants.VoteAbstain]

    for (let i = 0; i < votingOrder.length; i++) {
      const voter = await createRandomAccount()

      const assetAmount = new Asset(amounts[i], TokenUtil.tokenCode, TokenUtil.tokenPrecision)
      await TokenUtil.issue({ amount: assetAmount.toString(), issuer: token, contract: contracts.token })
      await contracts.token.transfer(token, voter, assetAmount.toString(), '', { authorization: `${token}@active` })

      await contracts.referendums.vote(referendum.params.referendumId, voter, votingOrder[i], { authorization: `${voter}@active` })
    }

    await TokenUtil.issue({ amount: (new Asset(20000, TokenUtil.tokenCode, TokenUtil.tokenPrecision)).toString(), issuer: token, contract: contracts.token })

    await sleep(2000)

    // Act
    await contracts.referendums.finish(referendum.params.referendumId, { authorization: `${referendum.params.creator}@active` })

    // Assert
    const referendumTables = await rpc.get_table_rows({
      code: referendums,
      scope: referendums,
      table: 'referendums',
      json: true
    })

    expect(referendumTables.rows[0]).to.deep.equals({
      referendum_id: referendum.params.referendumId,
      creator: referendum.params.creator,
      start_date: actionParams[2],
      end_date: actionParams[3],
      quorum_config: referendum.params.quorumConfig,
      majority_config: referendum.params.majorityConfig,
      status: ReferendumsFactory.Status().accepted,
      vote_tally: [
        { key: ReferendumConstants.VoteAbstain, value: (new Asset(amounts[3], TokenUtil.tokenCode, TokenUtil.tokenPrecision)).toString() },
        { key: ReferendumConstants.VoteAgainst, value: (new Asset(amounts[1] + amounts[2], TokenUtil.tokenCode, TokenUtil.tokenPrecision)).toString() },
        { key: ReferendumConstants.VoteFavour, value: (new Asset(amounts[0], TokenUtil.tokenCode, TokenUtil.tokenPrecision)).toString() }
      ]
    })

  })


  const finishRejectCases = [
    { 
      testName: 'Referendum is rejected if it has enough against votes',
      amounts: [1000, 50000, 30000, 20000],
      votingOrder: [ReferendumConstants.VoteFavour, ReferendumConstants.VoteAgainst, ReferendumConstants.VoteAgainst, ReferendumConstants.VoteAbstain]  
    },
    {
      testName: 'Referendum is rejected if it does not meet the required quorum',
      amounts: [10000, 20000000],
      votingOrder: [ReferendumConstants.VoteFavour, 'novote']
    }
  ]
  finishRejectCases.forEach(({ testName, amounts, votingOrder }) => {
    it(testName, async function () {

      // Arrange
      const now = new Date()
      now.setMilliseconds(now.getMilliseconds() + 500)

      const referendum = await ReferendumsFactory.createWithDefaults({ 
        startDate: now,
        quorumConfig: [{ start_day: 0, percentage: 8500 }],
        majorityConfig: [{ start_day: 0, percentage: 5500 }]
      })
      const actionParams = referendum.getActionParams()

      await contracts.referendums.create(...actionParams, { authorization: `${referendums}@active` })
      await sleep(1000)
      await contracts.referendums.start(referendum.params.referendumId, { authorization: `${referendum.params.creator}@active` })

      for (let i = 0; i < votingOrder.length; i++) {
        const voter = await createRandomAccount()

        const assetAmount = new Asset(amounts[i], TokenUtil.tokenCode, TokenUtil.tokenPrecision)
        await TokenUtil.issue({ amount: assetAmount.toString(), issuer: token, contract: contracts.token })
        await contracts.token.transfer(token, voter, assetAmount.toString(), '', { authorization: `${token}@active` })

        if (votingOrder[i] !== 'novote')
          await contracts.referendums.vote(referendum.params.referendumId, voter, votingOrder[i], { authorization: `${voter}@active` })
      }
      await sleep(2000)

      // Act
      await contracts.referendums.finish(referendum.params.referendumId, { authorization: `${referendum.params.creator}@active` })

      // Assert
      const referendumTables = await rpc.get_table_rows({
        code: referendums,
        scope: referendums,
        table: 'referendums',
        json: true
      })

      expect(referendumTables.rows[0]).to.deep.include({
        referendum_id: referendum.params.referendumId,
        quorum_config: referendum.params.quorumConfig,
        majority_config: referendum.params.majorityConfig,
        status: ReferendumsFactory.Status().rejected,
      })

    })
  })


})
