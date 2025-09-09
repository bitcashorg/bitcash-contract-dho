import { blockchain, ref, tok, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums day_percentage schedule (majority/quorum)", () => {
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

  it("applies majority threshold at day 0 vs after boundary", async () => {
    await tok("transfer", { from: Accounts.token, to: "alice", quantity: "1.0000 IMPACT", memo: "" })
    await tok("transfer", { from: Accounts.token, to: "bob", quantity: "1.0000 IMPACT", memo: "" })
    const { start, end } = futureWindowFromChain(2, 5) // 3-day duration
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: Accounts.defaultCreator,
        start_date: start,
        end_date: end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [
          { start_day: 1, percentage: 8000 }, // 80% at day 1
          { start_day: 2, percentage: 5000 }, // 50% from day 2 onward
        ],
      },
      `${Accounts.proposals}@active`,
    )
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)

    // Vote split 50/50 and advance to start+24h+1s (< day 1 boundary)
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 24 * 3600 + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    await ref("vote", { referendum_id: 1, voter: "alice", option: "yes" }, "alice@active")
    await ref("vote", { referendum_id: 1, voter: "bob", option: "no" }, "bob@active")

    // Contract finish at start+24h+1s: uses day 0 threshold (80%) -> rejected
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    let row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(row.status).to.equal("rejected")

    // Recreate a second referendum with same votes but after majority boundary crossed; finish should accept
    const { start: s2, end: e2 } = futureWindowFromChain(2, 5)
    await ref(
      "create",
      {
        referendum_id: 2,
        creator: Accounts.defaultCreator,
        start_date: s2,
        end_date: e2,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [
          { start_day: 1, percentage: 8000 },
          { start_day: 2, percentage: 5000 },
        ],
      },
      `${Accounts.proposals}@active`,
    )
    await ref("start", { referendum_id: 2 }, `${Accounts.referendums}@active`)
    const nowMs2 = blockchain.timestamp.toMilliseconds()
    const secToStart2 = Math.max(0, Math.ceil((Date.parse(s2) - nowMs2) / 1000)) + 2 * 24 * 3600 + 1
    blockchain.addTime(TimePointSec.from(secToStart2))
    await ref("vote", { referendum_id: 2, voter: "alice", option: "yes" }, "alice@active")
    await ref("vote", { referendum_id: 2, voter: "bob", option: "no" }, "bob@active")
    // already > start+24h; finish under day 1+ (threshold 50%)
    await ref("finish", { referendum_id: 2 }, `${Accounts.referendums}@active`)
    row = referendums.tables
      .referendums(nameToBigInt(Accounts.referendums))
      .getTableRows()
      .find((r) => r.referendum_id === 2)
    expect(row.status).to.equal("accepted")
  })
})
