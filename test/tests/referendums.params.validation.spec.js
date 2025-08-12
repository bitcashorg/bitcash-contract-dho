import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { expect } from "chai"
import { expectToThrow } from "@eosnetwork/vert"
import { Accounts, TimeWindows } from "../testConfig.js"

describe("Referendums param validation", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects start in past and end before start", async () => {
    const past = "1969-01-01T00:00:00.000"
    const start = TimeWindows.farFutureStart
    const end = TimeWindows.farFutureEnd
    await expectToThrow(
      ref(
        "create",
        {
          referendum_id: 1,
          creator: Accounts.defaultCreator,
          start_date: past,
          end_date: end,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      ),
      "eosio_assert: can not create a referendum in the past",
    )
    try {
      await ref(
        "create",
        {
          referendum_id: 1,
          creator: Accounts.defaultCreator,
          start_date: end,
          end_date: start,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("end date must be greater or equal")) throw e
    }
  })
})
