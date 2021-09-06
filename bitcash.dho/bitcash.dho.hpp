#pragma once

#include <string>
#include <optional>
#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>

#include <tables/config.hpp>
#include <tables/proposal.hpp>

using namespace eosio;
using std::string;
using std::optional;

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

    EOS_ACTION(updateprop)(
        const uint64_t& proposal_id,
        const optional<string>& title,
        const optional<string>& description,
        const optional<string>& kpi,
        const optional<asset>& budget,
        const optional<uint64_t>& deadline
    );

    EOS_ACTION(startdebate)(
        const uint64_t& proposal_id
    );

    EOS_ACTION(startvoting)(
        const uint64_t& proposal_id
    );

    EOS_ACTION(closevoting)(
        const uint64_t& proposal_id
    );

private:

    tables::config get_config();
    uint64_t available_proposal_id();
    tables::proposals::const_iterator require_proposal_author(const uint64_t& proposal_id);

    tables::config_singleton configs;
    tables::proposals proposals;

};
