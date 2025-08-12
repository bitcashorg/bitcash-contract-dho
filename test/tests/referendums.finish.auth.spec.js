import { blockchain, ref, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums finish auth differences", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  async function makeRef({ referendum_id, start, end }) {
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
  }

  const futureWindowFromChain = (daysStart, daysEnd) => {
    const baseMs = blockchain.timestamp.toMilliseconds()
    return {
      start: new Date(baseMs + daysStart * 24 * 3600 * 1000).toISOString().replace("Z", ""),
      end: new Date(baseMs + daysEnd * 24 * 3600 * 1000).toISOString().replace("Z", ""),
    }
  }

  it("creator/proposals cannot finish before end; contract can after 24h", async () => {
    const { start, end } = futureWindowFromChain(2, 10)
    const referendum_id = 1
    await makeRef({ referendum_id, start, end })
    // Advance to just after start
    const nowMs1 = blockchain.timestamp.toMilliseconds()
    const startMs = Date.parse(start)
    const secToJustAfterStart = Math.max(0, Math.ceil((startMs - nowMs1) / 1000)) + 3600
    blockchain.addTime(TimePointSec.from(secToJustAfterStart))

    // Creator cannot finish before end
    await expectToThrow(ref("finish", { referendum_id }, `${Accounts.defaultCreator}@active`), "eosio_assert: can not finish referendum, it is too soon")

    // Proposals contract cannot finish before end
    await expectToThrow(ref("finish", { referendum_id }, `${Accounts.proposals}@active`), "eosio_assert: can not finish referendum, it is too soon")

    // Advance another 24h so contract can finish (>= start + 24h)
    blockchain.addTime(TimePointSec.from(24 * 3600 + 1))
    await ref("finish", { referendum_id }, `${Accounts.referendums}@active`)
    const row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(["accepted", "rejected"]).to.include(row.status)
  })
})
