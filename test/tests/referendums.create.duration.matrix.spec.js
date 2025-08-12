import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums create duration matrix", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const base = {
    referendum_id: 1,
    creator: Accounts.defaultCreator,
    quorum: "0.0000 IMPACT",
    quorum_config: [{ start_day: 0, percentage: 0 }],
    majority_config: [{ start_day: 0, percentage: 5000 }],
  }

  it("rejects 0 days and >30 days; end<start", async () => {
    // 0 days
    try {
      await ref("create", { ...base, start_date: "2099-01-02T00:00:00.000", end_date: "2099-01-02T00:00:00.000" }, `${Accounts.proposals}@active`)
      throw new Error("should fail")
    } catch (e) {
      if (!String(e).includes("between 1 and 30")) throw e
    }
    // >30 days
    try {
      await ref("create", { ...base, start_date: "2099-01-02T00:00:00.000", end_date: "2099-02-10T00:00:00.000" }, `${Accounts.proposals}@active`)
      throw new Error("should fail")
    } catch (e) {
      if (!String(e).includes("between 1 and 30")) throw e
    }
    // end<start
    try {
      await ref("create", { ...base, start_date: "2099-01-05T00:00:00.000", end_date: "2099-01-04T00:00:00.000" }, `${Accounts.proposals}@active`)
      throw new Error("should fail")
    } catch (e) {
      if (!String(e).includes("end date must be greater or equal")) throw e
    }
  })
})
