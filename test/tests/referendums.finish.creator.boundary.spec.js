import { blockchain, ref, referendums } from "../util.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums creator finish boundary (end-1s fails; at end succeeds)", () => {
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

  it("creator finish blocked at end-1s; allowed at end", async () => {
    const { start, end } = futureWindowFromChain(2, 3) // 1 day duration
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
    // Start (contract may start before start date)
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)

    // Advance to just before end
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToEndMinus1 = Math.max(0, Math.ceil((Date.parse(end) - nowMs) / 1000)) - 1
    if (secToEndMinus1 > 0) blockchain.addTime(TimePointSec.from(secToEndMinus1))
    await expectToThrow(ref("finish", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`), "eosio_assert: can not finish referendum, it is too soon")

    // Advance 1s to reach end
    blockchain.addTime(TimePointSec.from(1))
    await ref("finish", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`)
    const row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(["accepted", "rejected"]).to.include(row.status)
  })
})
