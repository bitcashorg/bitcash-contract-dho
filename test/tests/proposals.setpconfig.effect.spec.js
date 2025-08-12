import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Proposals setpconfig effect on new proposals", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("newly created main uses updated default phase durations", async () => {
    // Update main default phases
    await prop(
      "setpconfig",
      {
        type: "main",
        default_phases: [
          { phase_name: "discussion", duration_days: 5, type: "dialog" },
          { phase_name: "debate", duration_days: 6, type: "dialog" },
          { phase_name: "prevote", duration_days: 7, type: "voting" },
          { phase_name: "voting", duration_days: 8, type: "voting" },
        ],
      },
      "prop.bitcash@active",
    )

    // Fund and create main
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Cfg"] },
          { first: "description", second: ["string", "d"] },
          { first: "kpi", second: ["string", "k"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )

    const row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    const durations = Object.fromEntries(row.phases.map((p) => [p.phase, p.duration_days]))
    if (durations["discussion"] !== 5 || durations["debate"] !== 6 || durations["prevote"] !== 7 || durations["voting"] !== 8) {
      throw new Error("new proposal did not use updated default phase durations")
    }
  })
})
