import { blockchain, prop, proposals, tok } from "../util.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { initContracts } from "../setup.js"

describe("util::get_attr error surfaces", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("missing required attribute reports 'required attribute: ...'", async () => {
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            // omit creator on purpose
            { first: "title", second: ["string", "AttrMissing"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        "alice@active",
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("required attribute: creator not found")) throw e
    }
  })

  it("attribute type mismatch reports clear message", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "AttrTypes"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["string", "notadate"] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        `${creator}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("attribute deadline type mismatch") && !msg.includes("type mismatch")) throw e
    }
  })
})
