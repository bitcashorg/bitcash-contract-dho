import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"

describe("Proposals stake gate at phase start", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("move blocked when creator below minstake; allowed after re-fund", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "StakeGate"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      creator,
    )
    const id = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id
    // elapse
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    // drain balance below minstake
    await tok("transfer", { from: creator, to: "bob", quantity: minStake, memo: "drain" }, `${creator}@active`)
    await expectToThrow(prop("move", { proposal_id: id }, creator), "eosio_assert: creator balance below min stake")
    // re-fund and move
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "refund" })
    await prop("move", { proposal_id: id }, creator)
  })
})
