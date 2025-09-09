import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { expect } from "chai"

describe("util::delete_table behavior via cleanupprops", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("deletes up to max_rows and handles empty table", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    // create 2 proposals
    for (let i = 0; i < 2; i++) {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", `D${i}`] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", deadline] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        `${creator}@active`,
      )
    }
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(2)

    // cleanup 1 row
    await prop("cleanupprops", { max_rows: 1 }, "prop.bitcash@active")
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(1)

    // cleanup remaining and verify empty call is harmless
    await prop("cleanupprops", { max_rows: 10 }, "prop.bitcash@active")
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(0)
    await prop("cleanupprops", { max_rows: 0 }, "prop.bitcash@active")
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(0)
  })
})
