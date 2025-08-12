import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"

describe("ChangeTime missing keys validation", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("fails when any of debate_days/prevote_days/voting_days is missing", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace("Z", "")
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
    // move main to debate so creation reaches key validation
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "t1" })
    await prop("move", { proposal_id: parentId }, `${creator}@active`)
    // set changetime scope params
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "changetime", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    const cases = [
      [
        { first: "type", second: ["name", "changetime"] },
        { first: "creator", second: ["name", creator] },
        { first: "title", second: ["string", "C"] },
        { first: "description", second: ["string", ""] },
        { first: "kpi", second: ["string", ""] },
        { first: "deadline", second: ["time_point", deadline] },
        { first: "parent", second: ["int64", parentId] },
        // missing debate_days
        { first: "prevote_days", second: ["int64", 7] },
        { first: "voting_days", second: ["int64", 7] },
      ],
      [
        { first: "type", second: ["name", "changetime"] },
        { first: "creator", second: ["name", creator] },
        { first: "title", second: ["string", "C"] },
        { first: "description", second: ["string", ""] },
        { first: "kpi", second: ["string", ""] },
        { first: "deadline", second: ["time_point", deadline] },
        { first: "parent", second: ["int64", parentId] },
        { first: "debate_days", second: ["int64", 7] },
        // missing prevote_days
        { first: "voting_days", second: ["int64", 7] },
      ],
      [
        { first: "type", second: ["name", "changetime"] },
        { first: "creator", second: ["name", creator] },
        { first: "title", second: ["string", "C"] },
        { first: "description", second: ["string", ""] },
        { first: "kpi", second: ["string", ""] },
        { first: "deadline", second: ["time_point", deadline] },
        { first: "parent", second: ["int64", parentId] },
        { first: "debate_days", second: ["int64", 7] },
        { first: "prevote_days", second: ["int64", 7] },
        // missing voting_days
      ],
    ]

    for (const args of cases) {
      let threw = false
      try {
        await prop("create", { args }, `${creator}@active`)
      } catch (e) {
        threw = true
        const msg = String(e)
        if (!msg.includes("required attribute") && !msg.includes("not found")) throw e
      }
      if (!threw) throw new Error("should fail")
    }
  })
})
