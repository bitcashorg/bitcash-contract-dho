/**
 * Constants representing different proposal types.
 * @enum {string}
 */
const ProposalConstants = {
  TypeMain: "main",
  TypeAmendment: "amendment",
  TypeExtendDebate: "extenddebate",
  TypeShortenDebate: "shortendebate",
}

/**
 * @typedef {Object} Phase
 * @property {string} phaseName - The name of the phase.
 * @property {number} durationDays - The duration of the phase in days.
 * @property {string} type - The type of the phase.
 */

/**
 * @typedef {Object} ActionParameter
 * @property {string} key - The key of the parameter.
 * @property {Array<string|number>} value - The value of the parameter.
 */

/**
 * Class representing a proposal.
 */
class Proposal {
  /**
   * Create a proposal.
   * @param {Object} params - The parameters for the proposal.
   * @param {number} [params.proposalId] - The proposal ID.
   * @param {string} params.type - The type of the proposal.
   * @param {string} params.creator - The creator of the proposal.
   * @param {string} params.title - The title of the proposal.
   * @param {string} params.description - The description of the proposal.
   * @param {string} params.kpi - The KPI of the proposal.
   * @param {string} params.deadline - The deadline of the proposal (formatted time point).
   * @param {Phase[]} [params.phases] - The phases of the proposal.
   * @param {number} [params.parent] - The parent proposal ID.
   * @param {Object} params.specialAttributes - Any special attributes for the proposal.
   */
  constructor({ proposalId, type, creator, title, description, kpi, deadline, phases, parent, ...specialAttributes }) {
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
      specialAttributes,
    }
  }

  /**
   * Format the phases for action parameters.
   * @returns {ActionParameter[]} The formatted phases.
   */
  formatPhases() {
    const phases = this.params.phases
    if (!phases) return []

    return phases
      .map((phase) => [
        { key: `phase_${phase.phaseName}_name`, value: ["name", phase.phaseName] },
        { key: `phase_${phase.phaseName}_duration_days`, value: ["int64", phase.durationDays] },
        { key: `phase_${phase.phaseName}_type`, value: ["name", phase.type] },
      ])
      .flat()
  }

  /**
   * Format the special attributes for action parameters.
   * @returns {ActionParameter[]} The formatted special attributes.
   */
  formatSpecialAttributes() {
    return Object.entries(this.params.specialAttributes).map(([key, attribute]) => attribute)
  }

  /**
   * Get the action parameters for the proposal.
   * @returns {ActionParams} The action parameters.
   */
  getActionParams() {
    const params = [
      { key: "type", value: ["name", this.params.type] },
      { key: "creator", value: ["name", this.params.creator] },
      { key: "title", value: ["string", this.params.title] },
      { key: "description", value: ["string", this.params.description] },
      { key: "kpi", value: ["string", this.params.kpi] },
      { key: "deadline", value: ["time_point", this.params.deadline] },
      { key: "parent", value: ["int64", this.params.parent] },
      ...this.formatPhases(),
      ...this.formatSpecialAttributes(),
    ]

    if (this.params.proposalId) {
      params.push({ key: "proposal_id", value: ["int64", this.params.proposalId] })
    }

    return constructActionParams(params)
  }
}

/**
 * Factory class for creating proposals with default values.
 */
class ProposalsFactory {
  /**
   * Generate a random account name.
   * @returns {string} The generated account name.
   */
  static _generateRandomAccount() {
    return `account_${Math.random().toString(36).substr(2, 8)}`
  }

  /**
   * Format a Date object into a time point string.
   * @param {Date} date - The date to format.
   * @returns {string} The formatted time point string.
   */
  static _formatTimePoint(date) {
    return date.toISOString().replace("T", " ").split(".")[0]
  }

  /**
   * Create an asset string.
   * @param {number} amount - The amount in smallest units.
   * @param {string} [code="EOS"] - The currency code.
   * @param {number} [precision=4] - The number of decimal places.
   * @returns {string} The formatted asset string.
   */
  static _createAsset(amount, code = "EOS", precision = 4) {
    return `${(amount / 10 ** precision).toFixed(precision)} ${code}`
  }

  /**
   * Create a proposal entry.
   * @param {Object} params - The parameters for the proposal.
   * @returns {Proposal} The created proposal.
   */
  static createEntry({ proposalId, type, creator, title, description, kpi, deadline, phases, parent, ...specialAttributes }) {
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
      ...specialAttributes,
    })
  }

  /**
   * Get default values for a proposal.
   * @param {Object} params - The parameters for the defaults.
   * @param {string} [params.title="default title"] - The default title.
   * @param {string} [params.description="default description"] - The default description.
   * @param {string} [params.kpi="default kpis"] - The default KPI.
   * @param {string} [params.deadline] - The deadline.
   * @returns {Object} The default proposal parameters.
   */
  static _getProposalDefaults({ title = "default title", description = "default description", kpi = "default kpis", deadline }) {
    const d = deadline ? new Date(deadline) : new Date()
    d.setDate(d.getDate() + 10)
    return {
      title,
      description,
      kpi,
      deadline: ProposalsFactory._formatTimePoint(d),
    }
  }

  /**
   * Create a main proposal with default values.
   * @param {Object} params - The parameters for the proposal.
   * @param {number} [params.proposalId] - The proposal ID.
   * @param {string} [params.creator] - The creator account.
   * @param {string} [params.title] - The title of the proposal.
   * @param {string} [params.description] - The description of the proposal.
   * @param {string} [params.kpi] - The KPI of the proposal.
   * @param {string} [params.deadline] - The deadline of the proposal.
   * @param {number} [params.budget] - The budget amount in smallest units.
   * @param {Phase[]} [params.phases] - The phases of the proposal.
   * @returns {Proposal} The created proposal.
   */
  static createMainWithDefaults({ proposalId, creator, title, description, kpi, deadline, budget, phases }) {
    const account = creator || ProposalsFactory._generateRandomAccount()
    const formattedBudget = ProposalsFactory._createAsset(budget || 1000000)
    return ProposalsFactory.createEntry({
      ...ProposalsFactory._getProposalDefaults({ title, description, kpi, deadline }),
      proposalId,
      type: ProposalConstants.TypeMain,
      creator: account,
      budget: { key: "budget", value: ["asset", formattedBudget] },
      parent: 0,
      phases,
    })
  }

  /**
   * Create an amendment proposal with default values.
   * @param {Object} params - The parameters for the proposal.
   * @param {number} [params.proposalId] - The proposal ID.
   * @param {string} [params.creator] - The creator account.
   * @param {string} [params.title] - The title of the proposal.
   * @param {string} [params.description] - The description of the proposal.
   * @param {string} [params.kpi] - The KPI of the proposal.
   * @param {string} [params.deadline] - The deadline of the proposal.
   * @param {number} [params.budget] - The budget amount in smallest units.
   * @param {Phase[]} [params.phases] - The phases of the proposal.
   * @param {number} [params.parent=1] - The parent proposal ID.
   * @returns {Proposal} The created proposal.
   */
  static createAmendmentWithDefaults({ proposalId, creator, title, description, kpi, deadline, budget, phases, parent = 1 }) {
    const account = creator || ProposalsFactory._generateRandomAccount()
    const formattedBudget = ProposalsFactory._createAsset(budget || 1000000)
    return ProposalsFactory.createEntry({
      ...ProposalsFactory._getProposalDefaults({ title, description, kpi, deadline }),
      proposalId,
      type: ProposalConstants.TypeAmendment,
      creator: account,
      budget: { key: "budget", value: ["asset", formattedBudget] },
      parent,
      phases,
    })
  }

  /**
   * Create an extend debate proposal with default values.
   * @param {Object} params - The parameters for the proposal.
   * @param {number} [params.proposalId] - The proposal ID.
   * @param {string} [params.creator] - The creator account.
   * @param {string} [params.title] - The title of the proposal.
   * @param {string} [params.description] - The description of the proposal.
   * @param {string} [params.kpi] - The KPI of the proposal.
   * @param {string} [params.deadline] - The deadline of the proposal.
   * @param {number} [params.days=3] - The number of days to extend.
   * @param {Phase[]} [params.phases] - The phases of the proposal.
   * @param {number} [params.parent=1] - The parent proposal ID.
   * @returns {Proposal} The created proposal.
   */
  static createExtendDebateWithDefaults({ proposalId, creator, title, description, kpi, deadline, days = 3, phases, parent = 1 }) {
    const account = creator || ProposalsFactory._generateRandomAccount()
    return ProposalsFactory.createEntry({
      ...ProposalsFactory._getProposalDefaults({ title, description, kpi, deadline }),
      proposalId,
      type: ProposalConstants.TypeExtendDebate,
      creator: account,
      days: { key: "days", value: ["int64", days] },
      parent,
      phases,
    })
  }

  /**
   * Create a shorten debate proposal with default values.
   * @param {Object} params - The parameters for the proposal.
   * @param {number} [params.proposalId] - The proposal ID.
   * @param {string} [params.creator] - The creator account.
   * @param {string} [params.title] - The title of the proposal.
   * @param {string} [params.description] - The description of the proposal.
   * @param {string} [params.kpi] - The KPI of the proposal.
   * @param {string} [params.deadline] - The deadline of the proposal.
   * @param {number} [params.days=2] - The number of days to shorten.
   * @param {Phase[]} [params.phases] - The phases of the proposal.
   * @param {number} [params.parent=1] - The parent proposal ID.
   * @returns {Proposal} The created proposal.
   */
  static createShortenDebateWithDefaults({ proposalId, creator, title, description, kpi, deadline, days = 2, phases, parent = 1 }) {
    const account = creator || ProposalsFactory._generateRandomAccount()
    return ProposalsFactory.createEntry({
      ...ProposalsFactory._getProposalDefaults({ title, description, kpi, deadline }),
      proposalId,
      type: ProposalConstants.TypeShortenDebate,
      creator: account,
      days: { key: "days", value: ["int64", days] },
      parent,
      phases,
    })
  }
}

/**
 * @typedef {Object} ActionParam
 * @property {string} first - The key name in the action parameters.
 * @property {[string, string|number|boolean]} second - A tuple where the first element is the type ("name", "string", etc.) and the second element is the value corresponding to that type.
 */

/**
 * @typedef {Object} ActionParams
 * @property {ActionParam[]} args - An array of action parameters.
 */

/**
 * Constructs the action parameters for the EOSIO `create` action.
 *
 * @param {Array<{key: string, value: [string, string|number|boolean]}>} inputArray - Input array of key-value pairs to convert.
 * @returns {ActionParams} The formatted action parameters.
 */
function constructActionParams(inputArray) {
  return {
    args: inputArray.map(({ key, value }) => {
      const [type, rawValue] = value

      let parsedValue

      // Parse the value based on type
      switch (type) {
        case "int64":
          parsedValue = parseInt(rawValue, 10)
          break
        case "double":
          parsedValue = parseFloat(rawValue)
          break
        case "bool":
          parsedValue = rawValue === "true"
          break
        default:
          parsedValue = rawValue // For "name", "string", "asset", "time_point", etc.
      }

      return {
        first: key,
        second: [type, parsedValue],
      }
    }),
  }
}

export { Proposal, ProposalsFactory, ProposalConstants, constructActionParams }
