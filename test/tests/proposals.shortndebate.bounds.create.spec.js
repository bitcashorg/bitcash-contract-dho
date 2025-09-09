import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ShortenDebate create bounds (days 1..30)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects days < 1 and > 30 on create", async () => {
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
    // move main to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "t1" })
    await prop("move", { proposal_id: parentId }, `${creator}@active`)
    // loosen scope config
    await prop("setgparam", { scope: "shortndebate", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "shortndebate", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    const tryCreate = async (days) => {
      let threw = false
      try {
        await prop(
          "create",
          {
            args: [
              { first: "type", second: ["name", "shortndebate"] },
              { first: "creator", second: ["name", creator] },
              { first: "title", second: ["string", "S"] },
              { first: "description", second: ["string", ""] },
              { first: "kpi", second: ["string", ""] },
              { first: "deadline", second: ["time_point", deadline] },
              { first: "parent", second: ["int64", parentId] },
              { first: "days", second: ["int64", days] },
            ],
          },
          `${creator}@active`,
        )
      } catch (e) {
        threw = true
        const msg = String(e)
        if (!msg.includes("shortening days must be between 1 and 30")) throw e
      }
      if (!threw) throw new Error("should fail")
    }

    await tryCreate(0)
    await tryCreate(31)
  })
})
