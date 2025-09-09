import { blockchain, prop, proposals, referendums, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ShortenDebate floor enforcement (>=1 day)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects when parent debate would drop below 1 day", async () => {
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
    // move main to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    let pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parentId = pRows[0].proposal_id
    await prop("move", { proposal_id: parentId }, `${creator}@active`)
    pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const phases = pRows[0].phases
    const idx = phases.findIndex((ph) => ph.phase === pRows[0].current_phase)
    const debateDays = phases[idx].duration_days

    // scope config for shortndebate
    await prop("setgparam", { scope: "shortndebate", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "shortndebate", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // create child with days causing <1 total
    const shortenDays = debateDays // drop to 0
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "shortndebate"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Shorten Too Much"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "days", second: ["int64", shortenDays] },
        ],
      },
      `${creator}@active`,
    )

    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows
      .map((r) => r.proposal_id)
      .filter((id) => id !== parentId)
      .reduce((a, b) => (a > b ? a : b))

    // move child to voting (shortndebate debate lasts 10 days)
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup" })
    await prop("move", { proposal_id: childId }, `${creator}@active`)
    // ensure current phase is voting
    let childRow = proposals.tables
      .proposals(nameToBigInt("prop.bitcash"))
      .getTableRows()
      .find((r) => r.proposal_id === childId)
    if (childRow.current_phase !== "voting") throw new Error("child not in voting phase")

    // vote yes and finish
    const refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRefId = refRows[refRows.length - 1].referendum_id
    await ref("vote", { referendum_id: childRefId, voter: creator, option: "yes" }, `${creator}@active`)
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await ref("finish", { referendum_id: childRefId }, "refe.bitcash@active")

    // ensure the child voting phase meets its duration well beyond boundary before ending
    blockchain.addTime(TimePointSec.from(30 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "end-topup" })
    let threw = false
    try {
      await prop("move", { proposal_id: childId }, `${creator}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("phase duration cannot be less than 1 day")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
