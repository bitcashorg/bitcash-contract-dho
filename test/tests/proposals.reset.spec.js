import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { expect } from "chai"

describe("Proposals reset action", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("clears all proposals and id restarts at 1", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    const deadline = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const create = async (title) =>
      prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", title] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", deadline] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        `${creator}@active`,
      )

    await create("A1")
    await create("A2")
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(2)

    // reset
    await prop("reset", {}, "prop.bitcash@active")
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(0)

    // create again; id should restart at 1
    await create("B1")
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows[0].proposal_id).to.equal(1)
  })
})
