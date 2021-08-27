#pragma once
#include <eosio/eosio.hpp>
#include <vector>
#include <string>

using namespace eosio;
using std::vector;
using std::string;

namespace Phase {
    constexpr name draft      = "draft"_n;
    constexpr name debate     = "debate"_n;
    constexpr name voting     = "voting"_n;
    constexpr name rejected   = "rejected"_n;
    constexpr name accepted   = "accepted"_n;
}

namespace Type {
    constexpr name main       = "main"_n;
}

struct [[eosio::table("proposals"), eosio::contract("bitcashdho")]] proposal {
   uint64_t id;
   name author;
   string title;
   string description;
   string kpi;
   uint64_t budget;
   uint64_t deadline;
   name phase;
   name type;
   vector<uint64_t> related_proposals;
   uint64_t parent_proposal;
   name category;
   uint64_t account_code;
};

using proposals_table = multi_index<"proposals"_n, proposal>;
