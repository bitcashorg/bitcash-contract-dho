#pragma once
#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <vector>
#include <string>
#include <map>

using namespace eosio;
using std::vector;
using std::string;
using std::map;

namespace tables {
    struct [[eosio::table("proposals"), eosio::contract("bitcashdho")]] proposal {

        // proposal data
        uint64_t id;
        name author;
        string title;
        string description;
        string kpi;
        asset budget;
        uint64_t deadline;

        name category;
        uint64_t account_code;

        // internal data
        name phase;
        name type;
        vector<uint64_t> related_proposals;
        uint64_t parent_proposal;
        map<name, uint64_t> uint_config;

        uint64_t primary_key() const {
            return id;
        }

    };

    using proposals = multi_index<"proposals"_n, proposal>;
}
