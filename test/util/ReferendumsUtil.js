const { createRandomAccount } = require('../../scripts/eosio-util')

const ReferendumConstants = {
  VoteFavour: 'favour',
  VoteAgainst: 'against',
  VoteAbstain: 'abstain'
}

class Referendum {

  constructor (
    referendumId,
    creator,
    startDate,
    durationInDays,
    endDate,
    quorumConfig,
    majorityConfig
  ) {
    this.params = {
      referendumId,
      creator,
      startDate,
      endDate,
      durationInDays,
      quorumConfig,
      majorityConfig
    }
  }

  _formatTimePoint (date) {
    return date.toISOString().replace('Z', '')
  }

  getActionParams () {

    let endDate
    if (this.params.endDate) {
      endDate = this.params.endDate
    } else {
      endDate = new Date(this.params.startDate)
      endDate.setDate(this.params.startDate.getDate() + this.params.durationInDays)
    }

    return [
      this.params.referendumId,
      this.params.creator,
      this._formatTimePoint(this.params.startDate),
      this._formatTimePoint(endDate),
      this.params.quorumConfig,
      this.params.majorityConfig
    ]
  }

}

class ReferendumsFactory {

  static createEntry ({
    referendumId,
    creator,
    startDate,
    durationInDays,
    endDate,
    quorumConfig,
    majorityConfig
  }) {
    return new Referendum(
      referendumId,
      creator,
      startDate,
      durationInDays,
      endDate,
      quorumConfig,
      majorityConfig
    )
  }

  static async createWithDefaults ({
    referendumId,
    creator,
    startDate,
    durationInDays,
    endDate,
    quorumConfig,
    majorityConfig
  }) {
    referendumId = isFinite(referendumId) ? referendumId : 1
    
    if (!creator) {
      creator = await createRandomAccount() 
    }

    if (!startDate) {
      startDate = new Date()
      startDate.setDate(startDate.getDate() + 1)
    }

    durationInDays = isFinite(durationInDays) ? durationInDays : 10

    if (!quorumConfig) {
      quorumConfig = [{ start_day: 0, percentage: 5500 }, { start_day: 10, percentage: 2532 }]
    }
    
    if (!majorityConfig) {
      majorityConfig = [{ start_day: 0, percentage: 8500 }]
    }

    return ReferendumsFactory.createEntry({
      referendumId,
      creator,
      startDate,
      durationInDays,
      endDate,
      quorumConfig,
      majorityConfig
    })
  }

  static Status () {
    return {
      created: 'created',
      started: 'started',
      hold: 'hold',
      accepted: 'accepted',
      rejected: 'rejected'
    }
  }

}

module.exports = { Referendum, ReferendumsFactory, ReferendumConstants }
