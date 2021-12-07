const { createRandomAccount, formatTimePoint, Asset } = require('../../scripts/eosio-util')
const { TokenUtil } = require('./TokenUtil')

const ProposalConstants = {
  TypeMain: 'main'
}

class Proposal {

  constructor ({
    type,
    creator,
    title,
    description,
    kpi,
    deadline,
    phases,
    parent,
    ...specialAttributes
  }) {
    this.params = {
      type,
      creator,
      title,
      description,
      kpi,
      deadline,
      phases,
      parent,
      specialAttributes
    }
  }

  formatPhases () {
    const phases = this.params.phases
    if (phases === undefined) return []
  }

  formatSpecialAttributes () {
    const saFormated = []
    const keys = Object.keys(this.params.specialAttributes)
    for (const key of keys) {
      saFormated.push(this.params.specialAttributes[key])
    }
    return saFormated
  }

  getActionParams () {
    return [
      { key: 'type', value: ['name', this.params.type] },
      { key: 'creator', value: ['name', this.params.creator] },
      { key: 'title', value: ['string', this.params.title] },
      { key: 'description', value: ['string', this.params.description] },
      { key: 'kpi', value: ['string', this.params.kpi] },
      { key: 'deadline', value: ['time_point', this.params.deadline] },
      { key: 'parent', value: ['int64', this.params.parent] },
      ...this.formatPhases(),
      ...this.formatSpecialAttributes()
    ]
  }
}


class ProposalsFactory {

  static createEntry ({
    type,
    creator,
    title,
    description,
    kpi,
    deadline,
    phases,
    parent,
    ...specialAttributes
  }) {
    return new Proposal({
      type,
      creator,
      title,
      description,
      kpi,
      deadline,
      phases,
      parent,
      ...specialAttributes
    })
  }

  static _getProposalDefaults () {

    const d = new Date()
    d.setDate(d.getDate() + 10)

    return {
      title: 'default title',
      description: 'default description',
      kpi: 'default kpis',
      deadline: formatTimePoint(d)
    }
  }

  static async createMainWithDefaults ({
    creator,
    budget
  }) {
    if (!creator) {
      creator = await createRandomAccount() 
    }

    if (!budget) {
      budget = new Asset(1000000, TokenUtil.tokenCode, TokenUtil.tokenPrecision)
      budget = budget.toString()
    }

    return ProposalsFactory.createEntry({
      ...this._getProposalDefaults(),
      type: ProposalConstants.TypeMain,
      creator,
      budget: { key: 'budget', value: ['asset', budget] },
      parent: 0
    })
  }

}

module.exports = { Proposal, ProposalsFactory, ProposalConstants }
