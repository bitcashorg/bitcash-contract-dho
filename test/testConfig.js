export const Accounts = {
  proposals: "prop.bitcash",
  referendums: "refe.bitcash",
  token: "eosio.token",
  defaultCreator: "alice",
}

export const PhaseDurations = {
  discussion: 7,
  debate: 7,
  prevote: 7,
  voting: 7,
  extenddebate: 3,
}

export const TimeWindows = {
  standardStart: "1970-01-02T00:00:00.000",
  standardEnd: "1970-01-04T00:00:00.000",
  farFutureStart: "2099-01-02T00:00:00.000",
  farFutureEnd: "2099-01-05T00:00:00.000",
  altEarlyStart: "1970-02-01T00:00:00.000",
  altEarlyEnd: "1970-02-05T00:00:00.000",
  midFutureStart: "2070-01-02T00:00:00.000",
  midFutureEnd: "2070-01-05T00:00:00.000",
  nearFutureStart: "2030-01-02T00:00:00.000",
  nearFutureEnd: "2030-01-05T00:00:00.000",
}

export function futureDate(daysAhead = 1) {
  return new Date(Date.now() + daysAhead * 24 * 3600 * 1000).toISOString().replace("Z", "")
}

export function pastDate(daysAgo = 1) {
  return new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString().replace("Z", "")
}

export function futureWindow(daysStart = 1, daysEnd = 3) {
  return {
    start: futureDate(daysStart),
    end: futureDate(daysEnd),
  }
}
