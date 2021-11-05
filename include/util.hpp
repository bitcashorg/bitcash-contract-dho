#pragma once

#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>

namespace util 
{
  typedef std::variant<std::monostate, uint64_t, int64_t, double, eosio::name, eosio::asset, std::string> VariantValue;
}
