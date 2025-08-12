import { blockchain, prop, proposals, tok, referendums, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ChangeTime updates parent phase durations", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("applies new durations to all phases on acceptance", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "stake" })

    const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Main"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      creator,
    )

    // move to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    let pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parentId = pRows[0].proposal_id
    await prop("move", { proposal_id: parentId }, creator)

    // lower quorum and minstake for changetime
    await prop("setgparam", { scope: "changetime", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // create changetime child
    const debateDays = 5
    const prevoteDays = 4
    const votingDays = 6
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "changetime"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "ChangeTime"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "debate_days", second: ["int64", debateDays] },
          { first: "prevote_days", second: ["int64", prevoteDays] },
          { first: "voting_days", second: ["int64", votingDays] },
        ],
      },
      creator,
    )

    // child id
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows.find((r) => r.proposal_id !== parentId).proposal_id

    // child phases: debate(1 day) -> voting(2 days); step through precisely, vote and finish
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup" })
    await prop("move", { proposal_id: childId }, creator)
    // In voting: vote and finish
    let refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRefId = refRows[refRows.length - 1].referendum_id
    await ref("vote", { referendum_id: childRefId, voter: creator, option: "yes" }, "alice@active")
    blockchain.addTime(TimePointSec.from(3 * 24 * 3600))
    await ref("finish", { referendum_id: childRefId }, "refe.bitcash@active")
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup2" })
    await prop("move", { proposal_id: childId }, creator)

    // parent durations updated
    pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parent = pRows.find((r) => r.proposal_id === parentId)
    const map = Object.fromEntries(parent.phases.map((ph) => [ph.phase, ph.duration_days]))
    expect(map["debate"]).to.equal(debateDays)
    expect(map["prevote"]).to.equal(prevoteDays)
    expect(map["voting"]).to.equal(votingDays)
  })
})
