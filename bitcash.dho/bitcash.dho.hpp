#pragma once

#include <string>
#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>

#include <tables/config.hpp>
#include <tables/proposal.hpp>

using namespace eosio;
using std::string;

#define EOS_ACTION(name) [[eosio::action(#name)]] void name

class [[eosio::contract("bitcashdho")]] bitcashdho : public contract
{
public:
    bitcashdho(name receiver, name code, datastream<const char *> ds);

    EOS_ACTION(addproposal)(
        const name& author,
        const string& title,
        const string& description,
        const string& kpi,
        const asset& budget,
        const uint64_t& deadline
    );

private:

    config get_config();

    config_singleton configs;
    proposals_table proposals;

};
