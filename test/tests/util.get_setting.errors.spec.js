import { blockchain, prop } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"

describe("util::get_setting error surfaces", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("missing scope or key yields clear error", async () => {
    // setgparam requires contract auth; we won't set, to keep it missing
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "unknownscope"] },
            { first: "creator", second: ["name", "alice"] },
            { first: "title", second: ["string", "MissingSetting"] },
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
      if (!msg.includes("Unknown proposal type unknownscope")) throw e
    }
  })
})
