import { blockchain, prop, proposals, proposalUtil, ref, referendums, tok, token } from "../util.js"
import { initContracts } from "../setup.js"
import { Name, TimePointSec } from "@greymass/eosio"
import { expectToThrow, nameToBigInt } from "@eosnetwork/vert"
import { constructActionParams, ProposalsFactory } from "../proposalUtil.js"
import { expect } from "chai"
import { describe, it, beforeEach } from "mocha"

beforeEach(async () => {
  blockchain.resetTables()
  await initContracts()
})

describe("Proposal Tests", () => {
  it("account with balance can create a main proposal", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    const params = proposal.getActionParams()
    await prop("create", params, creator)
    const proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    // console.log(proposalsTable)
    // console.log("Phases", JSON.stringify(proposalsTable[0].phases), null, 2)
    expect(proposalsTable).length(1)
  })

  it("account with no or not enough balance can't create a main proposal", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    const params = proposal.getActionParams()
    await expectToThrow(prop("create", params, creator), "eosio_assert: no balance object found for account alice")
    await tok("transfer", { from: "eosio.token", to: creator, quantity: "0.0001 IMPACT", memo: "" })
    await expectToThrow(prop("create", params, creator), "eosio_assert_message: the account alice has 0.0001 IMPACT, minimum required balance to create this proposal is 10.0000 IMPACT")
    blockchain.addTime(TimePointSec.from(60 * 60 * 24 * 30))
  })

  it("should allow updating a proposal in the discussion phase", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    const createParams = proposal.getActionParams()
    await prop("create", createParams, creator)
    // console.log("createParams", JSON.stringify(createParams, null, 2))
    const proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(proposalsTable).length(1)
    const proposalId = proposalsTable[0].proposal_id
    // console.log("Proposal:", JSON.stringify(proposalsTable[0], null, 2))
    expect(proposalsTable[0].current_phase).to.equal("discussion")

    const updatedDeadline = TimePointSec.from(Date.now() / 1000 + 3600 * 24 * 20).toString() // Extend deadline by 20 days
    const updateParams = {
      args: [
        { first: "proposal_id", second: ["int64", proposalId] },
        { first: "deadline", second: ["time_point", updatedDeadline] },
      ],
    }
    await prop("update", updateParams, creator)
    const updatedProposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    // console.log("Updated Proposal:", JSON.stringify(updatedProposalsTable[0], null, 2))
    expect(new Date(updatedProposalsTable[0].deadline).getTime()).to.equal(new Date(updatedDeadline).getTime())
  })

  it("should not allow updating a proposal not in the discussion phase", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    const createParams = proposal.getActionParams()
    // console.log("createParams", JSON.stringify(createParams))

    await prop("create", createParams, creator)
    const proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    // console.log("Proposal:", JSON.stringify(proposalsTable[0], null, 2))

    const proposalId = proposalsTable[0].proposal_id
    blockchain.addTime(TimePointSec.from(60 * 60 * 24 * 7))
    await prop("move", { proposal_id: proposalId }, creator)
    const updatedProposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(updatedProposalsTable[0].current_phase).to.equal("debate")
    const updateParams = {
      args: [
        { first: "proposal_id", second: ["int64", proposalId] },
        { first: "title", second: ["string", "Attempted Update Title"] },
      ],
    }
    await expectToThrow(prop("update", updateParams, creator), "eosio_assert_message: can not modify proposal, it is not in discussion phase")
  })

  it("should only allow the proposal creator to update the proposal", async () => {
    const creator = "alice"
    const otherUser = "bob"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]

    // Transfer min stake to both users
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    await tok("transfer", { from: "eosio.token", to: otherUser, quantity: minStake, memo: "" })

    // Create a main proposal with default phases
    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    const createParams = proposal.getActionParams()
    await prop("create", createParams, creator)

    // Get the proposal ID
    const proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(proposalsTable).length(1)
    const proposalId = proposalsTable[0].proposal_id

    // Attempt to update the proposal as a different user
    const updateParams = {
      args: [
        { first: "proposal_id", second: ["int64", proposalId] },
        { first: "title", second: ["string", "Malicious Update Title"] },
      ],
    }

    // The other user attempts to update the proposal
    await expectToThrow(prop("update", updateParams, otherUser), `missing required authority ${creator}`)
  })
  it("moves discussion → debate when time elapsed and stake intact", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    await prop("create", proposal.getActionParams(), creator)

    let proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const proposalId = proposalsTable[0].proposal_id
    expect(proposalsTable[0].current_phase).to.equal("discussion")

    // elapse discussion, top-up, move
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: proposalId }, creator)

    proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(proposalsTable[0].current_phase).to.equal("debate")
  })

  it("moves debate → prevote when time elapsed and stake intact", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    await prop("create", proposal.getActionParams(), creator)

    // move to debate first
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup1" })
    let proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    await prop("move", { proposal_id: proposalsTable[0].proposal_id }, creator)

    // elapse debate, top-up, move to prevote
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup2" })
    proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    await prop("move", { proposal_id: proposalsTable[0].proposal_id }, creator)

    proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(proposalsTable[0].current_phase).to.equal("prevote")
  })

  it("prevote finishes referendum; proposal no longer open", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    await prop("create", proposal.getActionParams(), creator)

    // to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup1" })
    let proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    await prop("move", { proposal_id: proposalsTable[0].proposal_id }, creator)

    // to prevote (ample buffer)
    blockchain.addTime(TimePointSec.from(30 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup2" })
    proposalsTable = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    await prop("move", { proposal_id: proposalsTable[0].proposal_id }, creator)

    // Advance prevote phase to its end, then finish the referendum (no votes => likely rejected)
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup3" })
    const refTable = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const referendumId = refTable[0].referendum_id
    await ref("finish", { referendum_id: referendumId }, "prop.bitcash@active")
    const after = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()[0]
    expect(after.status).to.equal("rejected")
  })
})
