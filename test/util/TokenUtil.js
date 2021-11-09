const { assertError } = require('../../scripts/eosio-errors')

class TokenUtil {

  static tokenCode = 'BANK'
  static tokenPrecision = 4

  static async create ({ issuer, maxSupply, contractAccount, contract }) {
    try {
      await contract.create(issuer, maxSupply, { authorization: `${contractAccount}@active` })
    } catch (error) {
      assertError({
        error,
        textInside: 'token with symbol already exists',
        verbose: false
      })
    }
  }

  static async issue ({ amount, issuer, contract }) {
    await contract.issue(issuer, amount, 'issued token', { authorization: `${issuer}@active` })
  }

}

module.exports = { TokenUtil }
