const { createRandomAccount, formatTimePoint, Asset } = require('../../scripts/eosio-util')
const { TokenUtil } = require('./TokenUtil')

const ProposalConstants = {
  TypeMain: 'main',
  TypeAmendment: 'amendment',
  TypeExtendDebate: 'extenddebate',
  TypeShortenDebate: 'shortndebate'
}

class Proposal {

  constructor ({
    proposalId,
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
      proposalId,
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

    const formattedPhases = []
    for (const phase of phases) {
      formattedPhases.push({ key: `phase_${phase.phaseName}_name`, value: ['name', phase.phaseName] })
      formattedPhases.push({ key: `phase_${phase.phaseName}_duration_days`, value: ['int64', phase.durationDays] })
      formattedPhases.push({ key: `phase_${phase.phaseName}_type`, value: ['name', phase.type] })
    }

    console.log(formattedPhases)

    return formattedPhases
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
    const params = [
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

    if (this.params.proposalId) {
      params.push({ key: 'proposal_id', value: ['int64', this.params.proposalId] })
    }

    return params
  }
}


class ProposalsFactory {

  static createEntry ({
    proposalId,
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
      proposalId,
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

  static _getProposalDefaults ({
    title,
    description,
    kpi,
    deadline
  }) {

    const d = new Date()
    d.setDate(d.getDate() + 10)

    return {
      title: title || 'default title',
      description: description || 'default description',
      kpi: kpi || 'default kpis',
      deadline: deadline || formatTimePoint(d)
    }
  }

  static async createMainWithDefaults ({
    proposalId,
    creator,
    title,
    description,
    kpi,
    deadline,
    budget,
    phases
  }) {
    if (!creator) {
      creator = await createRandomAccount() 
    }

    if (!budget) {
      budget = new Asset(1000000, TokenUtil.tokenCode, TokenUtil.tokenPrecision)
      budget = budget.toString()
    }

    return ProposalsFactory.createEntry({
      ...this._getProposalDefaults({
        title,
        description,
        kpi,
        deadline
      }),
      proposalId,
      type: ProposalConstants.TypeMain,
      creator,
      budget: { key: 'budget', value: ['asset', budget] },
      parent: 0,
      phases
    })
  }


  static async createAmendmentWithDefaults ({
    proposalId,
    creator,
    title,
    description,
    kpi,
    deadline,
    budget,
    phases,
    parent
  }) {
    if (!creator) {
      creator = await createRandomAccount() 
    }

    if (!budget) {
      budget = new Asset(1000000, TokenUtil.tokenCode, TokenUtil.tokenPrecision)
      budget = budget.toString()
    }

    if (!parent) {
      parent = 1
    }

    return ProposalsFactory.createEntry({
      ...this._getProposalDefaults({
        title,
        description,
        kpi,
        deadline
      }),
      proposalId,
      type: ProposalConstants.TypeAmendment,
      creator,
      budget: { key: 'budget', value: ['asset', budget] },
      parent,
      phases
    })
  }

  static async createExtendDebateWithDefaults ({
    proposalId,
    creator,
    title,
    description,
    kpi,
    deadline,
    close_date,
    phases,
    parent
  }) {
    if (!creator) {
      creator = await createRandomAccount() 
    }

    if (!close_date) {
      const date = new Date()
      date.setDate(date.getDate() + 10)
      close_date = formatTimePoint(date)
    }

    if (!parent) {
      parent = 1
    }

    return ProposalsFactory.createEntry({
      ...this._getProposalDefaults({
        title,
        description,
        kpi,
        deadline
      }),
      proposalId,
      type: ProposalConstants.TypeExtendDebate,
      creator,
      close_date: { key: 'close_date', value: ['time_point', close_date] },
      parent,
      phases
    })
  }

  static async createShortenDebateWithDefaults ({
    proposalId,
    creator,
    title,
    description,
    kpi,
    deadline,
    close_date,
    phases,
    parent
  }) {
    if (!creator) {
      creator = await createRandomAccount() 
    }

    if (!close_date) {
      const date = new Date()
      date.setDate(date.getDate() + 10)
      close_date = formatTimePoint(date)
    }

    if (!parent) {
      parent = 1
    }

    return ProposalsFactory.createEntry({
      ...this._getProposalDefaults({
        title,
        description,
        kpi,
        deadline
      }),
      proposalId,
      type: ProposalConstants.TypeShortenDebate,
      creator,
      close_date: { key: 'close_date', value: ['time_point', close_date] },
      parent,
      phases
    })
  }

}

module.exports = { Proposal, ProposalsFactory, ProposalConstants }
