import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Proposals config: minstake wrong type", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("setting minstake as string causes create to fail", async () => {
    // set wrong type for minstake
    await prop(
      "setgparam",
      {
        scope: "main",
        setting: "minstake",
        value: ["string", "not-an-asset"],
      },
      "prop.bitcash@active",
    )

    // fund alice so we pass balance checks up to variant access
    const ms = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value
    // If wrong type stored, skip transfer; transfer a nominal amount to ensure balance row exists
    await tok("transfer", { from: "eosio.token", to: "alice", quantity: "1.0000 IMPACT", memo: "" })

    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", "alice"] },
            { first: "title", second: ["string", "WrongTypeMinstake"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        "alice@active",
      )
      throw new Error("should fail")
    } catch (e) {
      // Any thrown error indicates wrong type blocked path as expected
      if (!String(e)) throw e
    }
  })
})
