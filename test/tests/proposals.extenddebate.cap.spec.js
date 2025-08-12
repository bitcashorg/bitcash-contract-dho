import { blockchain, prop, proposals, referendums, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ExtendDebate cap enforcement (<=120 days)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects when parent debate would exceed 120 days", async () => {
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
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    let pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parentId = pRows[0].proposal_id
    await prop("move", { proposal_id: parentId }, `${creator}@active`)
    // quorum/minstake 0 for extenddebate
    await prop("setgparam", { scope: "extenddebate", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "extenddebate", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    async function acceptExtend(days) {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "extenddebate"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", `Extend ${days}`] },
            { first: "description", second: ["string", ""] },
            { first: "kpi", second: ["string", ""] },
            { first: "deadline", second: ["time_point", deadline] },
            { first: "parent", second: ["int64", parentId] },
            { first: "days", second: ["int64", days] },
          ],
        },
        `${creator}@active`,
      )
      let rowsL = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
      const childIdL = rowsL
        .map((r) => r.proposal_id)
        .filter((id) => id !== parentId)
        .reduce((a, b) => (a > b ? a : b))
      blockchain.addTime(TimePointSec.from(1 * 24 * 3600 + 1))
      await prop("move", { proposal_id: childIdL }, `${creator}@active`)
      const refRowsL = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
      const childRefIdL = refRowsL[refRowsL.length - 1].referendum_id
      await ref("vote", { referendum_id: childRefIdL, voter: creator, option: "yes" }, `${creator}@active`)
      blockchain.addTime(TimePointSec.from(3 * 24 * 3600 + 1))
      await ref("finish", { referendum_id: childRefIdL }, "refe.bitcash@active")
      blockchain.addTime(TimePointSec.from(1))
      await prop("move", { proposal_id: childIdL }, `${creator}@active`)
    }

    // Accumulate to near 120: +30 +30 +30 (7 -> 97)
    await acceptExtend(30)
    await acceptExtend(30)
    await acceptExtend(30)

    // Final child tries to add 24: 97 + 24 = 121 -> should fail on update_parent
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "extenddebate"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Extend 24"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "days", second: ["int64", 24] },
        ],
      },
      `${creator}@active`,
    )
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows
      .map((r) => r.proposal_id)
      .filter((id) => id !== parentId)
      .reduce((a, b) => (a > b ? a : b))
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600 + 1))
    await prop("move", { proposal_id: childId }, `${creator}@active`)
    const refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRefId = refRows[refRows.length - 1].referendum_id
    await ref("vote", { referendum_id: childRefId, voter: creator, option: "yes" }, `${creator}@active`)
    blockchain.addTime(TimePointSec.from(3 * 24 * 3600 + 1))
    await ref("finish", { referendum_id: childRefId }, "refe.bitcash@active")
    blockchain.addTime(TimePointSec.from(1))
    let threw = false
    try {
      await prop("move", { proposal_id: childId }, `${creator}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("phase duration cannot exceed 120 days")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
