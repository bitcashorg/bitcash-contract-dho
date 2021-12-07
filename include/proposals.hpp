#pragma once

#include <eosio/asset.hpp>
#include <eosio/eosio.hpp>
#include <util.hpp>
#include <common/tables/proposals.hpp>


CONTRACT proposals : public eosio::contract {

  public:

    using contract::contract;
    proposals(eosio::name receiver, eosio::name code, eosio::datastream<const char*> ds)
      : contract(receiver, code, ds)
        {}

    
    DEFINE_PROPOSALS_TABLE

    TABLE phases_config_table {
      eosio::name type;
      std::vector<common::types::phase> default_phases;

      uint64_t primary_key () const { return type.value; }
    };
    typedef eosio::multi_index<"phasesconf"_n, phases_config_table> phases_config_tables;
    

    ACTION reset();

    ACTION create(std::map<std::string, common::types::variant_value> & args);

    ACTION setpconfig(const eosio::name & type, std::vector<common::types::phase_config> & default_phases);

};
