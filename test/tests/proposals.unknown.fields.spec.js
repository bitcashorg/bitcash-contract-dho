import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { expect } from "chai"

describe("Proposals unknown fields are ignored", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("create succeeds with extraneous fields; update ignores unknowns", async () => {
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
          { first: "title", second: ["string", "UnknownFields"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          // extraneous
          { first: "foo", second: ["string", "bar"] },
        ],
      },
      `${creator}@active`,
    )
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(1)
    const id = rows[0].proposal_id

    await prop(
      "update",
      {
        args: [
          { first: "proposal_id", second: ["int64", id] },
          { first: "nonexistent", second: ["string", "ignored"] },
        ],
      },
      `${creator}@active`,
    )
    // still single row; core fields persisted; unknown field not stored
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows.length).to.equal(1)
    expect(rows[0].creator).to.equal("alice")
    expect(rows[0].type).to.equal("main")
    const sa = rows[0].special_attributes
    if (sa) {
      expect(JSON.stringify(sa)).to.not.include('"foo"')
    }
  })
})
