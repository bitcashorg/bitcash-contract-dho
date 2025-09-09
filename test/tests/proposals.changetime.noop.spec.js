import { blockchain, prop, proposals, referendums, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ChangeTime no-op (accept but no change)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("accepted changetime with same values keeps parent durations", async () => {
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
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    // record main default durations
    let pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parentId = pRows[0].proposal_id
    const defaults = pRows[0].phases
    const def = {
      debate: defaults.find((p) => p.phase === "debate").duration_days,
      prevote: defaults.find((p) => p.phase === "prevote").duration_days,
      voting: defaults.find((p) => p.phase === "voting").duration_days,
    }

    // move main to debate
    blockchain.addTime(TimePointSec.from(def.debate * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: parentId }, `${creator}@active`)

    // allow changetime: set minstake/quorum 0 in its scope
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "changetime", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // create changetime child with same values as defaults
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "changetime"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "NoOp"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "debate_days", second: ["int64", def.debate] },
          { first: "prevote_days", second: ["int64", def.prevote] },
          { first: "voting_days", second: ["int64", def.voting] },
        ],
      },
      `${creator}@active`,
    )

    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows.find((r) => r.proposal_id !== parentId).proposal_id

    // move child to voting, vote and finish
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup" })
    await prop("move", { proposal_id: childId }, `${creator}@active`)
    const refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRefId = refRows[refRows.length - 1].referendum_id
    await ref("vote", { referendum_id: childRefId, voter: creator, option: "yes" }, `${creator}@active`)
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await ref("finish", { referendum_id: childRefId }, "refe.bitcash@active")

    // end child voting phase, parent should keep same durations
    blockchain.addTime(TimePointSec.from(3 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "end-topup" })
    await prop("move", { proposal_id: childId }, `${creator}@active`)

    pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parent = pRows.find((r) => r.proposal_id === parentId)
    const after = {
      debate: parent.phases.find((p) => p.phase === "debate").duration_days,
      prevote: parent.phases.find((p) => p.phase === "prevote").duration_days,
      voting: parent.phases.find((p) => p.phase === "voting").duration_days,
    }
    expect(after.debate).to.equal(def.debate)
    expect(after.prevote).to.equal(def.prevote)
    expect(after.voting).to.equal(def.voting)
  })
})
