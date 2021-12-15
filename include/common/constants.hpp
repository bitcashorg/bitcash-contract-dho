#pragma once

#include <eosio/eosio.hpp>

namespace common
{
  const eosio::symbol token_symbol = eosio::symbol("BANK", 4);

  namespace contracts
  {
    constexpr eosio::name bank_token = "eosio.token"_n;
  }

  namespace settings
  {
    constexpr eosio::name min_stake = "minstake"_n;
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

  namespace proposals
  {
    constexpr eosio::name phase_discussion = "discussion"_n;
    constexpr eosio::name phase_debate = "debate"_n;
    constexpr eosio::name phase_debate_voting = "debatevoting"_n;
    constexpr eosio::name phase_voting = "voting"_n;
    constexpr eosio::name phase_accepted = "accepted"_n;
    constexpr eosio::name phase_rejected = "rejected"_n;

    constexpr eosio::name type_main = "main"_n;
  }
}