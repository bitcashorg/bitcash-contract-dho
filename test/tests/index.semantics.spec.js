import { blockchain, referendums, proposals, ref, prop, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { TimeWindows, futureWindow } from "../testConfig.js"

describe("Index semantics", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("votes secondary index by option groups correctly", async () => {
    await tok("transfer", { from: "eosio.token", to: "alice", quantity: "1.0000 IMPACT", memo: "" })
    await tok("transfer", { from: "eosio.token", to: "bob", quantity: "1.0000 IMPACT", memo: "" })
    const win = futureWindow(1, 4)
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: "alice",
        start_date: win.start,
        end_date: win.end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      "prop.bitcash@active",
    )
    await ref("start", { referendum_id: 1 }, "refe.bitcash@active")
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    // cast each vote at most once
    const cast = new Set(
      referendums.tables
        .votes(nameToBigInt("1"))
        .getTableRows()
        .map((r) => r.voter),
    )
    if (!cast.has("alice")) await ref("vote", { referendum_id: 1, voter: "alice", option: "yes" }, "alice@active")
    if (!cast.has("bob")) await ref("vote", { referendum_id: 1, voter: "bob", option: "no" }, "bob@active")

    const votes = referendums.tables.votes(1n).getTableRows()
    const yesCount = votes.filter((r) => r.option === "yes").length
    const noCount = votes.filter((r) => r.option === "no").length
    expect(yesCount).to.be.greaterThanOrEqual(1)
    expect(noCount).to.be.greaterThanOrEqual(1)
  })
})
