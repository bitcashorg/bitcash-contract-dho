import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { expect } from "chai"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"

describe("Proposals validation rules", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects main with nonzero parent", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await expectToThrow(
      prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "Main"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", deadline] },
            { first: "parent", second: ["int64", 2] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        creator,
      ),
      "eosio_assert: parent of main proposal must be id = 0, since a main proposal does not have a parent",
    )
  })

  it("rejects creation with past deadline", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    // advance chain a bit to stabilize
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    const past = "1970-01-01T00:00:00.000"
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "Main"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", past] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        creator,
      )
      throw new Error("should fail")
    } catch (e) {
      if (!String(e).includes("proposal deadline must be in the future")) throw e
    }

    // The rest (update to past) is implementation-defined; creation check suffices here
  })
})
