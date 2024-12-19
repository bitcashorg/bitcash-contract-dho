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
    const proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
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
    await tok("transfer", { from: "eosio.token", to: creator, quantity: "0.0001 EOS", memo: "" })
    await expectToThrow(prop("create", params, creator), "eosio_assert_message: the account alice has 0.0001 EOS, minimum required balance to create this proposal is 10.0000 EOS")
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
    const proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
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
    const updatedProposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
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
    const proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
    // console.log("Proposal:", JSON.stringify(proposalsTable[0], null, 2))

    const proposalId = proposalsTable[0].proposal_id
    blockchain.addTime(TimePointSec.from(60 * 60 * 24 * 7))
    await prop("move", { proposal_id: proposalId }, creator)
    const updatedProposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
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
    const proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
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
  it("should allow moving the proposal through all phases and enforce correct behavior at each phase", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    // Create a main proposal with default phases
    const proposal = ProposalsFactory.createMainWithDefaults({ creator })
    const createParams = proposal.getActionParams()
    await prop("create", createParams, creator)

    // Get the proposal ID
    let proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
    expect(proposalsTable).length(1)
    const proposalId = proposalsTable[0].proposal_id

    // Define the phases and their durations (in seconds for simulation)
    const phaseDurations = {
      discussion: 7 * 24 * 3600, // 7 days
      debate: 7 * 24 * 3600, // 7 days
      prevote: 7 * 24 * 3600, // 7 days
      vote: 7 * 24 * 3600, // 7 days
    }

    // Phases in the order they should occur
    const phasesOrder = ["discussion", "debate", "prevote", "vote", "completed"]

    // Helper function to advance time and move to the next phase
    const moveToNextPhase = async (expectedPhase) => {
      // Get current phase from the proposals table
      proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
      const currentPhase = proposalsTable[0].current_phase

      // Advance time by the duration of the current phase
      blockchain.addTime(TimePointSec.from(phaseDurations[currentPhase]))
      const refTable = referendums.tables.referendums(nameToBigInt("eospropvotes")).getTableRows()
      console.log("refTable", JSON.stringify(refTable, null, 2))
      // Move the proposal to the next phase
      await prop("move", { proposal_id: proposalId }, creator)

      // Fetch the updated proposal
      proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
      const newPhase = proposalsTable[0].current_phase
      expect(newPhase).to.equal(expectedPhase)
    }

    // Test behavior at each phase
    for (let i = 0; i < phasesOrder.length; i++) {
      const currentPhase = proposalsTable[0].current_phase
      const expectedPhase = phasesOrder[i]

      // Verify the current phase
      expect(currentPhase).to.equal(expectedPhase)

      // Attempt to update the proposal's deadline
      const newDeadlineDate = new Date(Date.now() + 3600 * 24 * 20 * 1000) // 20 days in the future
      const newDeadline = newDeadlineDate.toISOString().split(".")[0] // Remove milliseconds

      const updateParams = {
        args: [
          { first: "proposal_id", second: ["int64", proposalId] },
          { first: "deadline", second: ["time_point", newDeadline] },
        ],
      }

      if (currentPhase === "discussion") {
        // Should allow update
        await prop("update", updateParams, creator)

        // Verify the update
        proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
        const storedDeadline = proposalsTable[0].deadline.split(".")[0]
        expect(storedDeadline).to.equal(newDeadline)
      } else {
        // Should not allow update
        await expectToThrow(prop("update", updateParams, creator), "eosio_assert_message: can not modify proposal, it is not in discussion phase")
      }

      // Move to the next phase if not completed
      if (currentPhase !== "completed") {
        await moveToNextPhase(phasesOrder[i + 1])

        // If we've just moved to 'vote' phase, finish the referendum
        if (phasesOrder[i + 1] === "vote") {
          // Advance time to simulate the referendum duration
          blockchain.addTime(TimePointSec.from(phaseDurations["vote"]))

          // Finish the referendum
          // const referendumId = proposalId // Assuming referendum ID is the same as proposal ID
          const refTable = referendums.tables.referendums(nameToBigInt("referendums")).getTableRows()
          console.log("refTable", JSON.stringify(refTable, null, 2))
          const referendumId = refTable[0].referendum_id
          await ref("finish", { referendum_id: referendumId }, "proposals@active")
        }
      }
    }

    // Verify that the proposal is in 'completed' status
    proposalsTable = proposals.tables.proposals(nameToBigInt("proposals")).getTableRows()
    expect(proposalsTable[0].status).to.equal("completed")
  })
})
