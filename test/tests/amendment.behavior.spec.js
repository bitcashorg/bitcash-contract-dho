import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Amendment behavior (phase preconditions)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("amendment creation only allowed when parent in debate", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "M"] },
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

    // Try to create amendment while parent not in debate
    let threw = false
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "amendment"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "A"] },
            { first: "description", second: ["string", ""] },
            { first: "kpi", second: ["string", ""] },
            { first: "deadline", second: ["time_point", deadline] },
            { first: "parent", second: ["int64", parentId] },
          ],
        },
        `${creator}@active`,
      )
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("can be only created when main proposal is on debate")) throw e
    }
    if (!threw) throw new Error("should fail")

    // Move parent to debate and create amendment successfully
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: parentId }, `${creator}@active`)
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "amendment"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "A"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
        ],
      },
      `${creator}@active`,
    )
  })
})
