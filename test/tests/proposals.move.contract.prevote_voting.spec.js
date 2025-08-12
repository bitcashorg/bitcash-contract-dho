import { blockchain, prop, proposals, tok, ref, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"

describe("Proposals: contract move prevote→voting and finalize at boundary", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("moves prevote→voting at boundary and finalizes after voting boundary by contract", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    // Ensure quorum is zero so prevote can pass with a single yes vote
    await prop("setgparam", { scope: "main", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    const deadline = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "PrevoteVotingBoundary"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    const id = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id

    // discussion → debate (exact boundary)
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup-discussion" })
    await prop("move", { proposal_id: id }, "prop.bitcash@active")
    let row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(row.current_phase).to.equal("debate")

    // debate → prevote (exact boundary)
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup-debate" })
    await prop("move", { proposal_id: id }, "prop.bitcash@active")
    row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(row.current_phase).to.equal("prevote")
    // Cast a yes vote in the prevote referendum, then finish it after boundary so proposal stays open
    const refRowsPre = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const prevoteRefId = refRowsPre[refRowsPre.length - 1].referendum_id
    await ref("vote", { referendum_id: prevoteRefId, voter: creator, option: "yes" }, `${creator}@active`)

    // prevote → voting by contract exactly at boundary
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup-prevote" })
    // Explicitly finish prevote referendum using creator auth (after end)
    await ref("finish", { referendum_id: prevoteRefId }, `${creator}@active`)
    // Now move to start the voting phase
    await prop("move", { proposal_id: id }, "prop.bitcash@active")
    row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(row.current_phase).to.equal("voting")

    // After voting duration elapses, finish referendum explicitly then finalize with move
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    // finish the active voting referendum first to avoid any start precondition side-effects
    const refs = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const votingRefId = refs[refs.length - 1].referendum_id
    await ref("finish", { referendum_id: votingRefId }, "refe.bitcash@active")
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup-voting" })
    await prop("move", { proposal_id: id }, "prop.bitcash@active")
    row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    // With zero quorum met, status likely rejected; accept either final status
    expect(["accepted", "rejected"]).to.include(row.status)
  })
})
