import { blockchain, ref, tok, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Referendums cleanupvotes variants", () => {
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

  it("max_rows 0 deletes none; large value deletes all", async () => {
    // seed voters (ensure they have balances)
    for (const acct of [Accounts.defaultCreator, "bob", "carol"]) {
      await tok("transfer", { from: Accounts.token, to: acct, quantity: "1.0000 IMPACT", memo: "" })
    }

    const { start, end } = futureWindowFromChain(1, 3)
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: Accounts.defaultCreator,
        start_date: start,
        end_date: end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      `${Accounts.proposals}@active`,
    )
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    // ensure we're just after start
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(secToStart))

    // cast 3 votes
    await ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`)
    await ref("vote", { referendum_id: 1, voter: "bob", option: "no" }, `bob@active`)
    await ref("vote", { referendum_id: 1, voter: "carol", option: "abstain" }, `carol@active`)

    const before = referendums.tables.votes(1n).getTableRows().length
    if (before !== 3) throw new Error("expected 3 votes before cleanup")

    // zero deletes none
    await ref("cleanupvotes", { referendum_id: 1, max_rows: 0 }, `${Accounts.referendums}@active`)
    const mid = referendums.tables.votes(1n).getTableRows().length
    if (mid !== 3) throw new Error("expected 0 deletions when max_rows is 0")

    // large deletes all
    await ref("cleanupvotes", { referendum_id: 1, max_rows: 100 }, `${Accounts.referendums}@active`)
    const after = referendums.tables.votes(1n).getTableRows().length
    if (after !== 0) throw new Error("expected all votes deleted")
  })
})
