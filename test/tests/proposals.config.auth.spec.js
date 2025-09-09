import { blockchain, prop } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"

describe("Proposals config auth", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("setpconfig and setgparam require contract auth", async () => {
    await expectToThrow(
      prop(
        "setpconfig",
        {
          type: "main",
          default_phases: [{ phase_name: "discussion", duration_days: 7, type: "time" }],
        },
        "alice@active",
      ),
      "missing required authority prop.bitcash",
    )

    await expectToThrow(
      prop(
        "setgparam",
        {
          scope: "main",
          setting: "minstake",
          value: ["asset", "1.0000 IMPACT"],
        },
        "alice@active",
      ),
      "missing required authority prop.bitcash",
    )
  })
})
