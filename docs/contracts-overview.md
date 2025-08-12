<!-- @format -->

## Smart contracts: functionality, tables, and actions

This project ships two production contracts and one local token used for tests:

- `prop.bitcash` (proposals)
- `refe.bitcash` (referendums)
- `eosio.token` (token used for stake and voting weight)

Token symbol is `IMPACT` with 4 decimals.

### Common constants (selected)

- **proposals statuses**: `open`, `approved`, `rejected`
- **proposal phases**: `discussion`, `debate`, `prevote`, `voting`
- **referendum statuses**: `created`, `started`, `hold`, `accepted`, `rejected`
- **vote options**: `yes`, `no`, `abstain`

---

## `prop.bitcash` (proposals)

### Tables

- `proposals` (scope: `prop.bitcash`)
  - `proposal_id` (pk)
  - `creator` (`name`)
  - `type` (`name`: `main` | `amendment` | `extenddebate` | `shortndebate` | `changetime`)
  - `deadline` (`time_point`)
  - `status` (`name`: see statuses above)
  - `current_phase` (`name`)
  - `phases` (`vector<phase>`: `{ phase, duration_days, type, start_date, end_date }`)
  - `parent` (`uint64`)
  - `awaiting` (`vector<uint64>`: child proposal ids waiting on parent)
  - `special_attributes` (`map<string, variant_value>`) – includes keys like `referendum_id_phase_<phase>`
  - Secondary indices: `bystatusid`, `bystatustype`, `byprntstat`, `byprntphse`, `byprnttype`

- `phasesconf` (scope: `prop.bitcash`)
  - `type` (`name`)
  - `default_phases` (`vector<phase>`) – default timeline per proposal type

- `config` (scope: `<proposal_type>` e.g. `main`, `changetime`)
  - `setting` (`name`): `minstake` (`asset`), `votethresh` (`int64`), `quorum` (`asset`)
  - `value` (`variant_value`)

### Actions

- `reset()`
  - Auth: `prop.bitcash`
  - Effect: deletes all proposals

- `create(map<string, variant_value> args)`
  - Auth: `creator`
  - Required args: `type:name`, `creator:name`, `title:string` (in `special_attributes`), `description:string`, `kpi:string`, `deadline:time_point`, `parent:int64`, `budget:asset`
  - Guards: `creator` balance ≥ `minstake(type)`; `deadline` > now; for child types, parent existence and phase requirements
  - Effect: creates proposal with default phases (first phase `start_date` = now)

- `update(map<string, variant_value> args)`
  - Auth: `creator`
  - Required args: `proposal_id:int64`; optional: `deadline:time_point`
  - Guards: only in `discussion`; any new `deadline` must be > now

- `cancel(uint64 proposal_id)`
  - Auth: `creator`
  - Guards: only in `discussion`
  - Effect: deletes the proposal

- `move(uint64 proposal_id)`
  - Auth: `creator` OR `prop.bitcash`
  - Behavior: ends current phase (time-based via phase `duration_days`) and starts next phase
  - Guards at start: creator balance ≥ `minstake(type)`; for `voting` phase a referendum is created and auto-started

- `setpconfig(name type, vector<phase_config> default_phases)`
  - Auth: `prop.bitcash`
  - Guards: `duration_days` in [1, 120]
  - Effect: sets default phases per type

- `setgparam(name scope, name setting, variant_value value)`
  - Auth: `prop.bitcash`
  - Effect: sets general parameters like `minstake`, `quorum` for a type scope

- `cleanupprops(uint32 max_rows)`
  - Auth: `prop.bitcash`
  - Effect: batched deletion from `proposals`

### Child proposal effects

- `extenddebate` – increases parent current phase `duration_days` by `days` (cap ≤ 120)
- `shortndebate` – decreases parent current phase `duration_days` by `days` (floor ≥ 1)
- `changetime` – sets parent `debate`/`prevote`/`voting` `duration_days` to requested values (each validated)

---

## `refe.bitcash` (referendums)

### Tables

- `referendums` (scope: `refe.bitcash`)
  - `referendum_id` (pk)
  - `creator` (`name`)
  - `start_date` (`time_point`)
  - `end_date` (`time_point`)
  - `status` (`name`)
  - `quorum` (`asset`) – absolute threshold
  - `quorum_config` (`vector<day_percentage>`) – validated schedule
  - `majority_config` (`vector<day_percentage>`) – validated schedule
  - `votes_favour`/`votes_against`/`votes_abstain` (`asset`)

- `votes` (scope: `referendum_id`)
  - `voter` (`name`) (pk)
  - `amount` (`asset`) – snapshot stored; final tally re-computed at finish
  - `option` (`name`): `yes` | `no` | `abstain`
  - `weight` (`uint32`)
  - Secondary index: `byoption`

### Actions

- `reset()`
  - Auth: `refe.bitcash`
  - Effect: deletes all referendums and their `votes`

- `create(uint64 id, name creator, time_point start, time_point end, asset quorum, vector<day_percentage> quorum_cfg, vector<day_percentage> majority_cfg)`
  - Auth: `refe.bitcash` OR `prop.bitcash`
  - Guards: `start` ≥ now; `end` ≥ `start`; `quorum.symbol` = `IMPACT`; precision ≤ 18; `duration_days` in [1, 30]; schedules validated (increasing `start_day`, decreasing `percentage`, ≤ 10000)
  - Effect: creates referendum with status `created`

- `start(uint64 id)`
  - Auth: `creator` OR `prop.bitcash` OR `refe.bitcash`
  - Guards: status `created`; if not `refe.bitcash`, `start_date` ≤ now
  - Effect: status → `started`

- `hold(uint64 id)` / `resume(uint64 id)`
  - Auth: `refe.bitcash`
  - Guards: `hold` requires `started`; `resume` requires `hold`

- `finish(uint64 id)`
  - Auth: `creator` OR `prop.bitcash` OR `refe.bitcash`
  - Guards: status `started`; if not `refe.bitcash`, now ≥ `end_date`; if `refe.bitcash`, now ≥ `start_date + 24h`
  - Effect: re-tallies from current token balances, checks quorum and majority schedule, sets `accepted`/`rejected`, and persists tallies

- `vote(uint64 id, name voter, name option)`
  - Auth: `voter`
  - Guards: status `started`; one vote per voter; voter must hold `IMPACT` with amount > 0; option in {`yes`,`no`,`abstain`}
  - Effect: records vote and adds to running tallies

- `clearvote(uint64 id, name voter)`
  - Auth: `voter`
  - Guards: referendum must be finished
  - Effect: deletes the voter’s row from `votes`

- `cleanupref(uint64 id)`
  - Auth: `refe.bitcash`
  - Guards: finished and ≥ 7 days after `end_date`
  - Effect: deletes votes for `id` and the referendum row

- `cleanupold(uint32 days_old)`
  - Auth: `refe.bitcash`
  - Guards: `days_old` ≥ 30
  - Effect: removes finished referendums older than cutoff (batched)

- `cleanupvotes(uint64 id, uint32 max_rows)` / `cleanuprefs(uint32 max_rows)`
  - Auth: `refe.bitcash`
  - Effect: batched cleanup of `votes` or `referendums`

### VotingPhase linkage (from proposals)

When a proposal enters a `voting`-type phase, the proposals contract:

- computes a majority threshold based on total planned duration
- creates a referendum on `refe.bitcash` with phase-aligned `start_date` and `end_date`
- immediately starts it
- on phase end, if the referendum expired but not finished, attempts to finish it inline

---

## Notes and examples

### Example: create and move a `main` proposal

```bash
# set minimal stake and quorum for main
cleos push action prop.bitcash setgparam '["main", "minstake", ["asset","0.0000 IMPACT"]]' -p prop.bitcash
cleos push action prop.bitcash setgparam '["main", "quorum",   ["asset","0.0000 IMPACT"]]' -p prop.bitcash

# create
cleos push action prop.bitcash create '{"args":[["type",["name","main"]],["creator",["name","alice"]],["title",["string","MyProp"]],["description",["string","desc"]],["kpi",["string","kpi"]],["deadline",["time_point","2099-01-05T00:00:00.000"]],["parent",["int64",0]],["budget",["asset","0.0000 IMPACT"]]]}' -p alice

# move through phases (assuming enough time has passed and stake intact)
cleos push action prop.bitcash move '[1]' -p prop.bitcash
```

Keep tests as the authoritative source for edge cases and exact guard messages.


