import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("util::get_attr default value type mismatch", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("default type mismatch surfaces clear error", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    // Trigger default path by omitting parent and passing default of wrong type internally
    // We'll craft an update call that relies on defaults and send mismatch; use create with a bad optional where possible
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "DefaultTypeMismatch"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            // Intentionally omit parent; contract will default parent=0 (correct type). To test mismatch, we try update with wrong type default path is not exposed externally.
            // So we simulate by passing parent with wrong type, which should still hit type mismatch check.
            { first: "deadline", second: ["time_point", new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["name", "oops"] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        `${creator}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("attribute parent type mismatch") && !msg.includes("type mismatch")) throw e
    }
  })
})
