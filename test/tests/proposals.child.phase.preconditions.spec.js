import { blockchain, prop, proposals, tok, ref, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { expectToThrow } from "@eosnetwork/vert"

describe("Child proposals phase preconditions", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const createMain = async (creator) => {
    const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace("Z", "")
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
    return proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id
  }

  it("extend/shorten/change_time can be only created when parent in debate", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const mainId = await createMain(creator)

    // Ensure changetime scope has minstake configured to reach phase checks
    await prop("setgparam", { scope: "changetime", setting: "minstake", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // Parent currently in discussion -> creating child must fail
    // extenddebate
    for (const type of ["extenddebate", "changetime"]) {
      try {
        await prop(
          "create",
          {
            args: [
              { first: "type", second: ["name", type] },
              { first: "creator", second: ["name", creator] },
              { first: "title", second: ["string", type] },
              { first: "description", second: ["string", "desc"] },
              { first: "kpi", second: ["string", "kpi"] },
              { first: "deadline", second: ["time_point", new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
              { first: "parent", second: ["int64", mainId] },
              { first: "budget", second: ["asset", "0.0000 IMPACT"] },
              ...(type === "changetime"
                ? [
                    { first: "debate_days", second: ["int64", 5] },
                    { first: "prevote_days", second: ["int64", 7] },
                    { first: "voting_days", second: ["int64", 7] },
                  ]
                : []),
            ],
          },
          `${creator}@active`,
        )
        throw new Error("should fail")
      } catch (e) {
        const msg = String(e)
        if (!msg.includes("can be only created when main proposal is on debate phase")) throw e
      }
    }

    // Move parent to debate and ensure create succeeds
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: mainId }, `${creator}@active`)

    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "extenddebate"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "ed"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
          { first: "parent", second: ["int64", mainId] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          { first: "days", second: ["int64", 3] },
        ],
      },
      `${creator}@active`,
    )
  })
})
