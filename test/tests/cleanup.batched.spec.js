import { blockchain, referendums as refc, proposals as proc, ref, prop, tok, proposals } from "../util.js"
import { initContracts } from "../setup.js"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { TimeWindows, futureWindow } from "../testConfig.js"

describe("Batched cleanup actions", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("cleanupvotes deletes up to max_rows", async () => {
    // seed tokens for voters
    await tok("transfer", { from: "eosio.token", to: "alice", quantity: "1.0000 IMPACT", memo: "" })
    await tok("transfer", { from: "eosio.token", to: "bob", quantity: "1.0000 IMPACT", memo: "" })
    await tok("transfer", { from: "eosio.token", to: "carol", quantity: "1.0000 IMPACT", memo: "" })
    // create and start a ref
    const win1 = futureWindow(1, 3)
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: "alice",
        start_date: win1.start,
        end_date: win1.end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      "prop.bitcash@active",
    )
    await ref("start", { referendum_id: 1 }, "refe.bitcash@active")
    // ensure we are past start
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))

    // add 3 votes once each
    const cast = new Set(
      refc.tables
        .votes(nameToBigInt("1"))
        .getTableRows()
        .map((r) => r.voter),
    )
    if (!cast.has("alice")) await ref("vote", { referendum_id: 1, voter: "alice", option: "yes" }, "alice@active")
    if (!cast.has("bob")) await ref("vote", { referendum_id: 1, voter: "bob", option: "no" }, "bob@active")
    if (!cast.has("carol")) await ref("vote", { referendum_id: 1, voter: "carol", option: "abstain" }, "carol@active")
    const before2 = refc.tables.votes(1n).getTableRows()
    expect(before2.length).to.equal(3)

    // cleanup 2 rows
    await ref("cleanupvotes", { referendum_id: 1, max_rows: 2 }, "refe.bitcash@active")
    const after1 = refc.tables.votes(1n).getTableRows()
    expect(after1.length).to.be.within(0, 1)

    // cleanup remaining
    await ref("cleanupvotes", { referendum_id: 1, max_rows: 2 }, "refe.bitcash@active")
    const after2 = refc.tables.votes(1n).getTableRows()
    expect(after2.length).to.equal(0)
  })

  it("cleanuprefs deletes batched rows", async () => {
    // create a few refs
    for (let i = 1; i <= 3; i++) {
      const win = futureWindow(1 + i, 3 + i)
      await ref(
        "create",
        {
          referendum_id: i,
          creator: "alice",
          start_date: win.start,
          end_date: win.end,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        "prop.bitcash@active",
      )
    }
    // ensure created rows exist before cleanup
    const created = refc.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    expect(created.length).to.equal(3)
    // delete 2
    await ref("cleanuprefs", { max_rows: 2 }, "refe.bitcash@active")
    const left = refc.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    expect(left.length).to.equal(1)
  })

  it("cleanupprops deletes batched rows", async () => {
    // create a few proposals
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: "alice", quantity: minStake, memo: "" })
    for (let i = 0; i < 3; i++) {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", "alice"] },
            { first: "title", second: ["string", `p${i}`] },
            { first: "description", second: ["string", "d"] },
            { first: "kpi", second: ["string", "k"] },
            { first: "deadline", second: ["time_point", futureWindow(15 + i, 16 + i).end] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        "alice@active",
      )
    }
    // Advance some time then cleanup
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    await prop("cleanupprops", { max_rows: 2 }, "prop.bitcash@active")
    const left = proc.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(left.length).to.equal(1)
  })
})
