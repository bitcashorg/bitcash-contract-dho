#pragma once

#include <eosio/eosio.hpp>

//! Change this constants to the environment you are deploying to
namespace common
{
  const eosio::symbol token_symbol = eosio::symbol("MOCKEOS", 4);
  const int64_t microseconds_per_day = 86400000000;

  namespace contracts
  {
    constexpr eosio::name bank_token = "mockeostoken"_n;
    constexpr eosio::name proposals = "testproposal"_n;
    constexpr eosio::name referendums = "testrefendum"_n;
  }

  namespace settings
  {
    constexpr eosio::name min_stake = "minstake"_n;
    constexpr eosio::name vote_threshold = "votethresh"_n;
    constexpr eosio::name quorum = "quorum"_n;
  }

  namespace referendums
  {
    constexpr eosio::name status_created = "created"_n;
    constexpr eosio::name status_started = "started"_n;
    constexpr eosio::name status_hold = "hold"_n;
    constexpr eosio::name status_accepted = "accepted"_n;
    constexpr eosio::name status_rejected = "rejected"_n;

    constexpr eosio::name vote_favour = "yes"_n;
    constexpr eosio::name vote_against = "no"_n;
    constexpr eosio::name vote_abstain = "abstain"_n;
  }

  namespace proposals
  {
    constexpr eosio::name type_main = "main"_n;
    constexpr eosio::name type_amendment = "amendment"_n;
    constexpr eosio::name type_extend_debate = "extenddebate"_n;
    constexpr eosio::name type_shorten_debate = "shortndebate"_n;
    constexpr eosio::name type_change_time = "changetime"_n;

    constexpr eosio::name status_open = "open"_n;
    constexpr eosio::name status_accepted = "approved"_n;
    constexpr eosio::name status_rejected = "rejected"_n;

    constexpr eosio::name phase_discussion = "discussion"_n;
    constexpr eosio::name phase_debate = "debate"_n;
    constexpr eosio::name phase_debate_voting = "prevote"_n;
    constexpr eosio::name phase_voting = "voting"_n;
    constexpr eosio::name phase_accepted = "approved"_n;
    constexpr eosio::name phase_rejected = "rejected"_n;

    namespace phases
    {
      constexpr eosio::name no_phase = "nophase"_n;
      constexpr eosio::name type_draft = "draft"_n;
      constexpr eosio::name type_dialog = "dialog"_n;
      constexpr eosio::name type_voting = "voting"_n;

      constexpr int64_t undefined_duration_days = -1;
    }
  }
}