import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ExtendDebate update bounds (<5 days)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("update fails when days >= 5", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "E"] },
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
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "t1" })
    await prop("move", { proposal_id: parentId }, `${creator}@active`)
    await prop("setgparam", { scope: "extenddebate", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "extenddebate", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "extenddebate"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "EE"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "days", second: ["int64", 1] },
        ],
      },
      `${creator}@active`,
    )
    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows
      .map((r) => r.proposal_id)
      .filter((id) => id !== parentId)
      .reduce((a, b) => (a > b ? a : b))
    // update days to 5 -> reject
    let threw = false
    try {
      await prop(
        "update",
        {
          args: [
            { first: "proposal_id", second: ["int64", childId] },
            { first: "days", second: ["int64", 5] },
          ],
        },
        `${creator}@active`,
      )
    } catch (e) {
      threw = true
    }
    if (!threw) throw new Error("should fail")
  })
})
