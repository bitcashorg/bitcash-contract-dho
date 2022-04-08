const { join } = require('path')

class ConfigUtil {

  constructor (contract) {
    this.contract = contract
    this.config = {}
  }

  async setConfig (config) {
    this.config = config
  }

  async setPhases (params, auth) {
    await this.contract.setpconfig(...params, { authorization: `${auth}@active` })
  }

  async setGeneralConfig (params, auth) {
    await this.contract.setgparam(...params, { authorization: `${auth}@active` })
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

  async create ({ path, config }) {
    const conf = this._getConfig({ 
      path, 
      config, 
      defaultPath: join(__dirname, '../config/phasesConfig.json')
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

    this.configUtil.setConfig(conf)

    return this.configUtil
  }

}

class ConfigGeneralBuilder extends ConfigBuilder {

  async create ({ path, config }) {
    const conf = this._getConfig({
      path,
      config,
      defaultPath: join(__dirname, '../config/params.json')
    })

    const keys = Object.keys(conf)
    for (const key of keys) {
      const params = [key]
      const constantsInfo = conf[key]

      const constants = Object.keys(constantsInfo)

      for (const c of constants) {
        params.push(c)
        params.push(constantsInfo[c])
      }

      await this.configUtil.setGeneralConfig(params, this.authorization)
    }

    this.configUtil.setConfig(conf)

    return this.configUtil
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

module.exports = { ConfigUtil, ConfigEngineer, ConfigPhasesBuilder, ConfigGeneralBuilder }
