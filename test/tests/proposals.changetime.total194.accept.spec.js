import { blockchain, prop, proposals, referendums, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt } from "@eosnetwork/vert"
import { expect } from "chai"

describe("ChangeTime boundary acceptance at total=194 days", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("accepts when debate+prevote+voting = 194", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Boundary"] },
          { first: "description", second: ["string", "d"] },
          { first: "kpi", second: ["string", "k"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    const parentId = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id
    // move parent to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "t1" })
    await prop("move", { proposal_id: parentId }, `${creator}@active`)

    // set changetime scope to allow creation
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "changetime", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // create changetime with 90,14,90 = 194
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "changetime"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "CT194"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "debate_days", second: ["int64", 90] },
          { first: "prevote_days", second: ["int64", 14] },
          { first: "voting_days", second: ["int64", 90] },
        ],
      },
      `${creator}@active`,
    )
    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows
      .map((r) => r.proposal_id)
      .filter((id) => id !== parentId)
      .reduce((a, b) => (a > b ? a : b))
    // move child to voting
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600 + 1))
    await prop("move", { proposal_id: childId }, `${creator}@active`)
    // vote yes and finish
    const refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRef = refRows[refRows.length - 1]
    await ref("vote", { referendum_id: childRef.referendum_id, voter: creator, option: "yes" }, `${creator}@active`)
    blockchain.addTime(TimePointSec.from(5 * 24 * 3600 + 1))
    await ref("finish", { referendum_id: childRef.referendum_id }, "refe.bitcash@active")
    // end child phase
    blockchain.addTime(TimePointSec.from(1))
    await prop("move", { proposal_id: childId }, `${creator}@active`)

    // parent durations updated to boundary values
    const parent = proposals.tables
      .proposals(nameToBigInt("prop.bitcash"))
      .getTableRows()
      .find((r) => r.proposal_id === parentId)
    const d = Object.fromEntries(parent.phases.map((p) => [p.phase, p.duration_days]))
    expect(d["debate"]).to.equal(90)
    expect(d["prevote"]).to.equal(14)
    expect(d["voting"]).to.equal(90)
  })
})
