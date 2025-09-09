import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"

describe("ChangeTime bounds and totals", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const createMainToDebate = async (creator, minStake) => {
    const deadline = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Main"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    const id = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: id }, `${creator}@active`)
    return id
  }

  it("debate_days out of bounds and total duration > 194 rejected", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    // Seed changetime minstake
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")
    const parentId = await createMainToDebate(creator, minStake)

    // debate_days < 1
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "changetime"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "CT"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["int64", parentId] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
            { first: "debate_days", second: ["int64", 0] },
            { first: "prevote_days", second: ["int64", 7] },
            { first: "voting_days", second: ["int64", 7] },
          ],
        },
        `${creator}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("debate_days must be between 1 and 90")) throw e
    }

    // total duration > 194
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "changetime"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "CT2"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["int64", parentId] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
            { first: "debate_days", second: ["int64", 90] },
            { first: "prevote_days", second: ["int64", 14] },
            { first: "voting_days", second: ["int64", 91] },
          ],
        },
        `${creator}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("voting_days must be between 1 and 90")) throw e
    }
  })
})
