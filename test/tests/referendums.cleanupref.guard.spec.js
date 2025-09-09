import { blockchain, ref, tok, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Referendums cleanupref 7-day guard", () => {
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

  it("fails before 7 days, succeeds after", async () => {
    await tok("transfer", { from: Accounts.token, to: Accounts.defaultCreator, quantity: "1.0000 IMPACT", memo: "" })
    const { start, end } = futureWindowFromChain(2, 5)
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
    // advance to just after start
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    // advance past end and finish by creator
    const afterStartMs = blockchain.timestamp.toMilliseconds()
    const toEndSecs = Math.max(0, Math.ceil((Date.parse(end) - afterStartMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(toEndSecs))
    await ref("finish", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`)

    // attempt cleanupref too early
    let threw = false
    try {
      await ref("cleanupref", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("must wait at least 7 days")) throw e
    }
    if (!threw) throw new Error("should fail")

    // advance 7 days and cleanup
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 + 1))
    await ref("cleanupref", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const rows = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()
    if (rows.length !== 0) throw new Error("cleanupref should delete the referendum")
  })
})
