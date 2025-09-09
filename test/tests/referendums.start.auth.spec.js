import { blockchain, ref, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums start auth and timing", () => {
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

  it("creator/proposals cannot start before start_date; contract can", async () => {
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

    await expectToThrow(ref("start", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`), "eosio_assert: can not start referendum, it is too soon")
    await expectToThrow(ref("start", { referendum_id: 1 }, `${Accounts.proposals}@active`), "eosio_assert: can not start referendum, it is too soon")
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)

    const row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(row.status).to.equal("started")
  })
})
