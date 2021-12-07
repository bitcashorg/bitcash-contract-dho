const { join } = require('path')

class ConfigUtil {

  constructor (contract) {
    this.contract = contract
  }

  async setPhases (params, auth) {
    await this.contract.setpconfig(...params, { authorization: `${auth}@active` })
  }

}

class ConfigBuilder {

  constructor (contract, authorization) {
    this.configUtil = new ConfigUtil(contract)
    this.authorization = authorization
  }

  _getConfig ({ path, config, defaultPath }) {
    let conf

    if (path === undefined && config === undefined) {
      conf = require(defaultPath)
    }
    else if (config !== undefined) {
      conf = config
    }
    else if (path !== undefined) {
      conf = require(path)
    }

    return conf
  }

  async formatParams ({ path, config }) {}
  async create ({ path, config }) {}

}

class ConfigPhasesBuilder extends ConfigBuilder {

  constructor (contract, authorization) {
    super(contract, authorization)
  }

  async create ({ path, config }) {
    const conf = this._getConfig({ 
      path, 
      config, 
      defaultPath: join(__dirname, '../examples/phasesConfig.json')
    })

    const keys = Object.keys(conf)
    for (const key of keys) {
      const params = [key]
      const phases = conf[key]

      const phasesConfig = []
      for (const phase of phases) {
        phasesConfig.push({
          phase_name: phase.phaseName,
          duration_days: phase.durationDays,
          type: phase.type
        })
      }
      params.push(phasesConfig)

      await this.configUtil.setPhases(params, this.authorization)
    }
  }

}

class ConfigEngineer {

  constructor (builder) {
    this.builder = builder
  }

  async execute ({ path, config }) {
    return this.builder.create({ path, config })
  }

}

module.exports = { ConfigUtil, ConfigEngineer, ConfigPhasesBuilder }
