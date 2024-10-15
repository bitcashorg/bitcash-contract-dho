#pragma once

#include <eosio/asset.hpp>
#include <eosio/eosio.hpp>
#include <util.hpp>
#include <common/tables/token_account.hpp>
#include <common/tables/proposals.hpp>
#include <common/tables/referendums.hpp>

CONTRACT proposals : public eosio::contract
{

public:
  using contract::contract;
  proposals(eosio::name receiver, eosio::name code, eosio::datastream<const char *> ds)
      : contract(receiver, code, ds)
  {
  }

  DEFINE_TOKEN_ACCOUNT

  DEFINE_PROPOSALS_TABLE

  DEFINE_PROPOSALS_TABLE_MULTI_INDEX

  DEFINE_REFERENDUMS_TABLE

  TABLE phases_config_table
  {
    eosio::name type;
    std::vector<common::types::phase> default_phases;

    uint64_t primary_key() const { return type.value; }

    EOSLIB_SERIALIZE(phases_config_table, (type)(default_phases))
  };
  typedef eosio::multi_index<"phasesconf"_n, phases_config_table> phases_config_tables;

  TABLE config_table
  {
    eosio::name setting;
    common::types::variant_value value;

    uint64_t primary_key() const { return setting.value; }

    EOSLIB_SERIALIZE(config_table, (setting)(value))
  };
  typedef eosio::multi_index<"config"_n, config_table> config_tables;

  ACTION resetprop();

  ACTION create(std::map<std::string, common::types::variant_value> & args);

  ACTION update(std::map<std::string, common::types::variant_value> & args);

  ACTION cancel(const uint64_t &proposal_id);

  ACTION move(const uint64_t &proposal_id);

  ACTION setpconfig(const eosio::name &type, std::vector<common::types::phase_config> &default_phases);

  ACTION setgparam(const eosio::name &scope, const eosio::name &setting, common::types::variant_value &value);
};
