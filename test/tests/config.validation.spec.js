import { blockchain, prop } from "../util.js"
import { initContracts } from "../setup.js"
import { expect } from "chai"
import { expectToThrow } from "@eosnetwork/vert"

describe("Config validation", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("setpconfig rejects invalid durations", async () => {
    // duration <= 0
    await expectToThrow(
      prop(
        "setpconfig",
        {
          type: "main",
          default_phases: [{ phase_name: "debate", duration_days: 0, type: "dialog" }],
        },
        "prop.bitcash@active",
      ),
      "eosio_assert: invalid duration_days for debate",
    )
    // large duration
    await expectToThrow(
      prop(
        "setpconfig",
        {
          type: "main",
          default_phases: [{ phase_name: "debate", duration_days: 9999, type: "dialog" }],
        },
        "prop.bitcash@active",
      ),
      "eosio_assert: invalid duration_days for debate",
    )
  })
})
