import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ChangeTime boundary rejection at total=195 days", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects when debate+prevote+voting > 194", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "BoundaryReject"] },
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
    // move parent to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "t1" })
    await prop("move", { proposal_id: parentId }, `${creator}@active`)

    // set changetime scope to allow creation
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "changetime", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // attempt changetime with 90,15,90 = 195 (should reject on create_impl)
    let threw = false
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "changetime"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "CT195"] },
            { first: "description", second: ["string", ""] },
            { first: "kpi", second: ["string", ""] },
            { first: "deadline", second: ["time_point", deadline] },
            { first: "parent", second: ["int64", parentId] },
            { first: "debate_days", second: ["int64", 90] },
            { first: "prevote_days", second: ["int64", 15] },
            { first: "voting_days", second: ["int64", 90] },
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
