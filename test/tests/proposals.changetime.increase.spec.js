import { blockchain, prop, proposals, tok, ref, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"

describe("ChangeTime increases debate/prevote/voting durations", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("accepted changetime updates all parent phases", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 50 * 24 * 3600 * 1000).toISOString().replace("Z", "")

    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "CT-INC"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    const pid = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id

    // Move to debate to be eligible parent
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup-discussion" })
    await prop("move", { proposal_id: pid }, `${creator}@active`)

    const before = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    const phases = before.phases
    const dIdx = phases.findIndex((p) => p.phase === "debate")
    const pIdx = phases.findIndex((p) => p.phase === "prevote")
    const vIdx = phases.findIndex((p) => p.phase === "voting")

    // Seed changetime config
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "changetime", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // Create changetime with increases
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "changetime"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "CT"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", pid] },
          { first: "debate_days", second: ["int64", phases[dIdx].duration_days + 3] },
          { first: "prevote_days", second: ["int64", phases[pIdx].duration_days + 2] },
          { first: "voting_days", second: ["int64", phases[vIdx].duration_days + 1] },
        ],
      },
      `${creator}@active`,
    )

    // Move child to voting, vote, and finish
    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows.find((r) => r.proposal_id !== pid).proposal_id
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup-child" })
    await prop("move", { proposal_id: childId }, `${creator}@active`)
    const rRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const refId = rRows[rRows.length - 1].referendum_id
    await ref("vote", { referendum_id: refId, voter: creator, option: "yes" }, `${creator}@active`)
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await ref("finish", { referendum_id: refId }, "refe.bitcash@active")
    blockchain.addTime(TimePointSec.from(3 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "end-child" })
    await prop("move", { proposal_id: childId }, `${creator}@active`)

    const after = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(after.phases[dIdx].duration_days).to.equal(phases[dIdx].duration_days + 3)
    expect(after.phases[pIdx].duration_days).to.equal(phases[pIdx].duration_days + 2)
    expect(after.phases[vIdx].duration_days).to.equal(phases[vIdx].duration_days + 1)
  })
})
