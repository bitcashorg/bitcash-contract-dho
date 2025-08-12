import { blockchain, prop, proposals, referendums, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Extend/Shorten chaining effects on debate duration", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const createMainToDebate = async (creator, minStake) => {
    const deadline = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString().replace("Z", "")
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
    const id = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: id }, `${creator}@active`)
    return id
  }

  const acceptChild = async (parentId, type, deltaDays, creator, minStake) => {
    const deadline = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    // Ensure quorum 0 for child scope
    await prop("setgparam", { scope: type, setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", type] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", type] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          ...(type === "extenddebate" ? [{ first: "days", second: ["int64", deltaDays] }] : []),
          ...(type === "shortendebate" ? [{ first: "days", second: ["int64", deltaDays] }] : []),
        ],
      },
      `${creator}@active`,
    )
    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows.find((r) => r.proposal_id !== parentId).proposal_id
    // move to voting
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup" })
    await prop("move", { proposal_id: childId }, `${creator}@active`)
    // vote yes
    const refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRefId = refRows[refRows.length - 1].referendum_id
    await ref("vote", { referendum_id: childRefId, voter: creator, option: "yes" }, `${creator}@active`)
    // finish
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await ref("finish", { referendum_id: childRefId }, "refe.bitcash@active")
    // move to end voting
    blockchain.addTime(TimePointSec.from(3 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "end" })
    await prop("move", { proposal_id: childId }, `${creator}@active`)
  }

  it("applies extend then changetime reduction cumulatively (not < 1)", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const parentId = await createMainToDebate(creator, minStake)
    let parent = proposals.tables
      .proposals(nameToBigInt("prop.bitcash"))
      .getTableRows()
      .find((r) => r.proposal_id === parentId)
    const phases = parent.phases
    const idx = phases.findIndex((p) => p.phase === parent.current_phase)
    const initialDebateDays = phases[idx].duration_days

    // extend +3
    await acceptChild(parentId, "extenddebate", 3, creator, minStake)
    parent = proposals.tables
      .proposals(nameToBigInt("prop.bitcash"))
      .getTableRows()
      .find((r) => r.proposal_id === parentId)
    const afterExtend = parent.phases[idx].duration_days
    expect(afterExtend).to.equal(initialDebateDays + 3)

    // changetime to reduce debate days to 1 (not below 1)
    // seed changetime minstake and quorum
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "changetime", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    const ctDeadline = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "changetime"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "ct"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", ctDeadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "debate_days", second: ["int64", 1] },
          { first: "prevote_days", second: ["int64", 7] },
          { first: "voting_days", second: ["int64", 7] },
        ],
      },
      `${creator}@active`,
    )
    let rows2 = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const ctChildId = rows2
      .filter((r) => r.proposal_id !== parentId)
      .map((r) => r.proposal_id)
      .reduce((a, b) => (a > b ? a : b))
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup-ct" })
    await prop("move", { proposal_id: ctChildId }, `${creator}@active`)
    const refs2 = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const ctRefId = refs2[refs2.length - 1].referendum_id
    await ref("vote", { referendum_id: ctRefId, voter: creator, option: "yes" }, `${creator}@active`)
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await ref("finish", { referendum_id: ctRefId }, "refe.bitcash@active")
    blockchain.addTime(TimePointSec.from(3 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "end-ct" })
    await prop("move", { proposal_id: ctChildId }, `${creator}@active`)
    parent = proposals.tables
      .proposals(nameToBigInt("prop.bitcash"))
      .getTableRows()
      .find((r) => r.proposal_id === parentId)
    const afterCT = parent.phases[idx].duration_days
    expect(afterCT).to.equal(1)
    expect(afterCT).to.be.greaterThanOrEqual(1)
  })
})
