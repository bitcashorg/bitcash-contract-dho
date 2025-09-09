import { blockchain, prop, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"

describe("util::get_setting missing key in valid scope", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("creating a changetime proposal without minstake set yields clear error", async () => {
    // ensure creator has a token balance row so we pass balance check and hit get_setting
    await tok("transfer", { from: "eosio.token", to: "alice", quantity: "1.0000 IMPACT", memo: "" })
    await expectToThrow(
      prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "changetime"] },
            { first: "creator", second: ["name", "alice"] },
            { first: "title", second: ["string", "NoMinStake"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        "alice@active",
      ),
      "eosio_assert: setting minstake is not configured for the scope changetime",
    )
  })
})
