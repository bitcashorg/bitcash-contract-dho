#pragma once

#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>

namespace util 
{
  typedef std::variant<std::monostate, uint64_t, int64_t, double, eosio::name, eosio::asset, std::string> VariantValue;

  template<typename T>
  inline void delete_table (const eosio::name & code, const uint64_t & scope)
  {
    T table(code, scope);
    auto itr = table.begin();
    while (itr != table.end())
    {
      itr = table.erase(itr);
    }
  }
}
