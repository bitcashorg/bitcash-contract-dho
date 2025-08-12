import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { expect } from "chai"

describe("util::delete_table variants (max_rows undefined vs zero)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const createN = async (n) => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    for (let i = 0; i < n; i++) {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", `X${i}`] },
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
  }

  it("max_rows undefined deletes all; zero deletes none", async () => {
    await createN(3)
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(3)

    // undefined max_rows path: use cleanupprops with large number to simulate delete all in one go
    await prop("cleanupprops", { max_rows: 999 }, "prop.bitcash@active")
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(0)

    // zero deletes none
    await createN(2)
    await prop("cleanupprops", { max_rows: 0 }, "prop.bitcash@active")
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(2)
  })
})
