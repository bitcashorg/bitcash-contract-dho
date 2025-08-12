import { blockchain, ref, referendums, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("referendums.reset clears all tables (util::delete_table all)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const futureWindowFromChain = (daysStart, daysEnd) => {
    const baseMs = blockchain.timestamp.toMilliseconds()
    return {
      start: new Date(baseMs + daysStart * 24 * 3600 * 1000).toISOString().replace("Z", ""),
      end: new Date(baseMs + daysEnd * 24 * 3600 * 1000).toISOString().replace("Z", ""),
    }
  }

  it("removes referendums and their votes", async () => {
    // Seed balances
    await tok("transfer", { from: Accounts.token, to: "alice", quantity: "1.0000 IMPACT", memo: "" })
    await tok("transfer", { from: Accounts.token, to: "bob", quantity: "1.0000 IMPACT", memo: "" })

    for (let i = 1; i <= 2; i++) {
      const { start, end } = futureWindowFromChain(2, 5)
      await ref(
        "create",
        {
          referendum_id: i,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: end,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      await ref("start", { referendum_id: i }, `${Accounts.referendums}@active`)
      // advance just after start to allow voting
      const nowMs = blockchain.timestamp.toMilliseconds()
      const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 1
      blockchain.addTime(TimePointSec.from(secToStart))
      if (i === 1) await ref("vote", { referendum_id: i, voter: "alice", option: "yes" }, "alice@active")
      if (i === 2) await ref("vote", { referendum_id: i, voter: "bob", option: "no" }, "bob@active")
    }

    // Sanity: rows exist
    let refs = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()
    expect(refs.length).to.equal(2)
    let votes1 = referendums.tables.votes(1n).getTableRows()
    let votes2 = referendums.tables.votes(2n).getTableRows()
    expect(votes1.length + votes2.length).to.be.greaterThan(0)

    // reset
    await ref("reset", {}, `${Accounts.referendums}@active`)

    refs = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()
    expect(refs.length).to.equal(0)
    votes1 = referendums.tables.votes(1n).getTableRows()
    votes2 = referendums.tables.votes(2n).getTableRows()
    expect(votes1.length + votes2.length).to.equal(0)
  })
})
