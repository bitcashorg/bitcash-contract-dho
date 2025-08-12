<!-- @format -->

## Tests Overview

All tests run with Mocha/Chai on the in-memory Antelope simulator (`@eosnetwork/vert`). Each spec is isolated in its own file and uses dynamic, chain-relative time windows to avoid flakiness. Config is applied from `test/configs/*.json` during `initContracts()`.

### Structure

- Test entry: `test/tests/*.spec.js`
- Helpers: `test/util.js`, `test/setup.js`, `test/testConfig.js`

### Conventions

- One scenario per file; keep assertions robust by substring-matching error messages
- Use `blockchain.addTime(TimePointSec.from(...))` to cross phase/ref boundaries
- Seed `minstake`/`quorum` per-scope when needed to reach targeted logic
- When checking tables, prefer `nameToBigInt(account)` for scopes

### Implemented specs

Proposals:
- `proposals.spec.js`: creation/update lifecycle; moves across phases
- `proposals.auth.spec.js`: create/update/cancel/move auth rules
- `proposals.cancel.behavior.spec.js`: cancel deletes row; unauthorized fails
- `proposals.cancel.phase.guard.spec.js`: cancel only in `discussion`
- `proposals.changetime.*.spec.js`: bounds validation; increase; full update
- `proposals.extenddebate.spec.js`: accepted child extends parent phase
- `proposals.shortendebate.spec.js`: accepted child shortens parent phase
- `proposals.extend_shorten.chain.spec.js`: cumulative effects chain
- `proposals.move.boundaries.spec.js`: time boundary guards
- `proposals.move.contract.boundaries.spec.js`: contract-led moves at boundaries
- `proposals.move.contract.prevote_voting.spec.js`: contract move prevote→voting, finalization
- `proposals.parent.validation.spec.js`: parent existence and self-parent guards
- `proposals.phase-timing.spec.js`: fails just-before, succeeds at boundary
- `proposals.reset.spec.js`: reset clears and restarts ID
- `proposals.stakegate.spec.js`: balance checked at phase start
- `proposals.unknown.fields.spec.js`: unknown fields ignored
- `proposals.unknown.type.spec.js`: unknown type rejected
- `proposals.update.types.spec.js`: wrong deadline type rejected
- `proposals.validation.spec.js`: parent nonzero rejected; past deadline rejected

Referendums:
- `referendums.config.validation.spec.js`: day_percentage arrays validation
- `referendums.daypercentage.schedule.spec.js`: threshold changes over time
- `referendums.finishguard.spec.js`: 24h guard for contract finish
- `referendums.finish.auth.spec.js`: auth differences for finish
- `referendums.finish.creator.boundary.spec.js`: end-1s fails; at end succeeds
- `referendums.hold.resume.spec.js`: lifecycle guards for hold/resume
- `referendums.majority.edge.spec.js`: all-abstain; 50/50 with 50% threshold
- `referendums.multiref.isolation.spec.js`: per-referendum voter isolation
- `referendums.params.bounds.spec.js`: quorum symbol; duration bounds
- `referendums.params.validation.spec.js`: start in past; end before start
- `referendums.quorum.precision.spec.js`: precision ≤ 18
- `referendums.reset.spec.js`: reset clears refs and votes
- `referendums.retally.spec.js`: re-tally at finish uses current balances
- `referendums.start.auth.spec.js`: start auth and timing
- `referendums.status.guards.spec.js`: start/hold/resume/finish status guards
- `referendums.vote.option.spec.js`: invalid vote option rejected
- `referendums.vote.status.spec.js`: vote only when started
- `referendums.voting.spec.js`: duplicate votes rejected; finish guards

Cleanup/Utils/Token:
- `cleanup.batched.spec.js`: `cleanupvotes`, `cleanuprefs`, `cleanupprops`
- `index.semantics.spec.js`: secondary index by option
- `token.edges.spec.js`: vote requires token balance > 0
- `util.delete_table.*.spec.js`: batched deletion semantics
- `util.get_attr.*.spec.js`: missing/type/default mismatch behaviors
- `util.get_setting.*.spec.js`: missing scope/key; missing key in valid scope

### Running tests

```bash
cd test
mocha ./tests/*.spec.js

# or using scripts split
npm run test-proposals
npm run test-referendums
```

### Notes

- Tests avoid touching `test/setup.js` global time to prevent regressions; instead they compute windows relative to the chain’s current timestamp.
- If you add tests that depend on config (e.g., `minstake`, `quorum`), set them explicitly in the spec before invoking the code path.


