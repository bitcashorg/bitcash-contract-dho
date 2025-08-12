import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"

describe("Referendums vote status gating", () => {
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

  it("blocks vote when not in started: created, hold, finished", async () => {
    // Seed balance for voter
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

    // 1) Before start: status=created
    await expectToThrow(ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`), "eosio_assert: can not vote, referendum is not in started status")

    // Start
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)

    // Hold
    await ref("hold", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    await expectToThrow(ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`), "eosio_assert: can not vote, referendum is not in started status")

    // Resume and finish to reach finished status
    await ref("resume", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    // Advance to start + 24h + 1s to satisfy contract finish guard
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 24 * 3600 + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    await expectToThrow(ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`), "eosio_assert: can not vote, referendum is not in started status")
  })
})
