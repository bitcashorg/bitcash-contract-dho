import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"

describe("Proposals cancel behavior", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("cancel removes the proposal; unauthorized cancel fails", async () => {
    const creator = "alice"
    const other = "bob"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    const deadline = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "CancelMe"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )

    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const id = rows[0].proposal_id

    await expectToThrow(prop("cancel", { proposal_id: id }, `${other}@active`), `missing required authority ${creator}`)

    await prop("cancel", { proposal_id: id }, `${creator}@active`)
    const left = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(left.length).to.equal(0)
  })
})
