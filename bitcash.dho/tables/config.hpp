#pragma once
#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <map>
#include <vector>

using namespace eosio;
using std::map;
using std::vector;
using std::pair;

struct [[eosio::table("config"), eosio::contract("bitcashdho")]] config {
    map<name, uint64_t> periods;
    map<name, vector<pair<uint64_t, uint8_t>>> periods_config;
    map<name, vector<name>> groups;
};

using config_singleton = singleton<"config"_n, config>;
