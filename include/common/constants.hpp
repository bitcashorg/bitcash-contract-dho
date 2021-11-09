#include <eosio/eosio.hpp>

namespace common
{
  const eosio::symbol token_symbol = eosio::symbol("BANK", 4);

  namespace contracts
  {
    constexpr eosio::name bank_token = "eosio.token"_n;
  }

  namespace referendums
  {
    constexpr eosio::name status_created = "created"_n;
    constexpr eosio::name status_started = "started"_n;
    constexpr eosio::name status_hold = "hold"_n;
    constexpr eosio::name status_accepted = "accepted"_n;
    constexpr eosio::name status_rejected = "rejected"_n;

    constexpr eosio::name vote_favour = "favour"_n;
    constexpr eosio::name vote_against = "against"_n;
    constexpr eosio::name vote_abstain = "abstain"_n;
  }
}