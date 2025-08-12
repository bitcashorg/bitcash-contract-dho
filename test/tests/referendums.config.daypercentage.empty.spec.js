import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums day_percentage arrays cannot be empty", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects empty quorum_config and majority_config", async () => {
    const base = {
      referendum_id: 1,
      creator: Accounts.defaultCreator,
      start_date: "2099-01-02T00:00:00.000",
      end_date: "2099-01-05T00:00:00.000",
      quorum: "0.0000 IMPACT",
    }
    // empty quorum_config
    let threw = false
    try {
      await ref("create", { ...base, quorum_config: [], majority_config: [{ start_day: 0, percentage: 5000 }] }, `${Accounts.proposals}@active`)
    } catch (e) {
      threw = true
      if (!String(e).includes("quorum config must have at least one entry")) throw e
    }
    if (!threw) throw new Error("should fail")

    // empty majority_config
    threw = false
    try {
      await ref("create", { ...base, quorum_config: [{ start_day: 0, percentage: 0 }], majority_config: [] }, `${Accounts.proposals}@active`)
    } catch (e) {
      threw = true
      if (!String(e).includes("majority config must have at least one entry")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
