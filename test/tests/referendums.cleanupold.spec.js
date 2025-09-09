import { blockchain, ref, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums cleanupold behavior", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  async function createAndFinish(referendum_id, start, end) {
    await ref(
      "create",
      {
        referendum_id,
        creator: Accounts.defaultCreator,
        start_date: start,
        end_date: end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      `${Accounts.proposals}@active`,
    )
    await ref("start", { referendum_id }, `${Accounts.referendums}@active`)
    // Move time to just after start
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 3600
    blockchain.addTime(TimePointSec.from(secToStart))
    // Then push beyond start + 24h
    blockchain.addTime(TimePointSec.from(24 * 3600 + 1))
    await ref("finish", { referendum_id }, `${Accounts.referendums}@active`)
  }

  const futureWindowFromChain = (daysStart, daysEnd) => {
    const baseMs = blockchain.timestamp.toMilliseconds()
    return {
      start: new Date(baseMs + daysStart * 24 * 3600 * 1000).toISOString().replace("Z", ""),
      end: new Date(baseMs + daysEnd * 24 * 3600 * 1000).toISOString().replace("Z", ""),
    }
  }

  it("rejects days_old < 30, and deletes only finished refs older than cutoff", async () => {
    // Arrange: three referendums with windows relative to current chain time; recompute per ref
    let w = futureWindowFromChain(2, 5)
    await createAndFinish(1, w.start, w.end)
    w = futureWindowFromChain(2, 5)
    await createAndFinish(2, w.start, w.end)
    w = futureWindowFromChain(2, 5)
    await createAndFinish(3, w.start, w.end)

    // Move chain forward 10 days (none should be old enough for cleanupold 30)
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await expectToThrow(ref("cleanupold", { days_old: 10 }, `${Accounts.referendums}@active`), "eosio_assert: cannot cleanup referendums less than 30 days old")

    // Move chain forward additional 40 days so all become eligible
    blockchain.addTime(TimePointSec.from(40 * 24 * 3600))
    await ref("cleanupold", { days_old: 30 }, `${Accounts.referendums}@active`)
    const left = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()
    expect(left.length).to.equal(0)
  })
})
