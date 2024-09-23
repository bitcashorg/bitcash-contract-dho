#pragma once

#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <common/data_types.hpp>

namespace util 
{
  typedef std::variant<std::monostate, uint64_t, int64_t, double, eosio::name, eosio::asset, std::string> VariantValue;

  uint64_t format_id (uint64_t id)
  {
    return id == 0 ? 1 : id;
  }

  template<typename T>
  eosio::asset get_account_balance (const eosio::name & code, const eosio::name & account, const eosio::symbol & symbol)
  {
    T token_accnts(code, account.value);

    const auto & bitr = token_accnts.get(symbol.code().raw(), ("no balance object found for account " + account.to_string()).c_str());
    return bitr.balance;
  }

  template<typename T, typename U>
  U get_setting (const eosio::name & code, const eosio::name & scope, const eosio::name & key)
  {
    T table(code, scope.value);
    auto itr = table.require_find(key.value, ("setting " + key.to_string() + " is not configured for the scope " + scope.to_string()).c_str() );
    return std::get<U>(itr->value);
  }

  template <eosio::name::raw TableName, typename T, typename... Indices>
   void clear_secondary(eosio::multi_index<TableName, T, Indices...>& tb)
   {
      (clear_secondary_index(
           tb.template get_index<static_cast<eosio::name::raw>(Indices::index_name)>()),
       ...);
   }

   template <eosio::name::raw TableName, typename T, typename... Indices>
   void clear_primary(eosio::multi_index<TableName, T, Indices...>& tb)
   {
      auto itr = eosio::internal_use_do_not_use::db_lowerbound_i64(
          tb.get_code().value, tb.get_scope(), static_cast<uint64_t>(TableName), 0);
      while (itr >= 0)
      {
         auto tmp = itr;
         uint64_t primary;
         itr = eosio::internal_use_do_not_use::db_next_i64(itr, &primary);
         eosio::internal_use_do_not_use::db_remove_i64(tmp);
      }
   }

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

  template<typename T>
  inline void delete_table (T&& tb)
   {
      clear_secondary(tb);
      clear_primary(tb);
   }
   
  template<typename T>
  T get_attr (
    const std::map<std::string, common::types::variant_value> & args, 
    const std::string attribute, 
    std::optional<common::types::variant_value> default_value = std::nullopt
  )
  {
    auto itr = args.find(attribute);

    if (itr == args.end())
    {
      if (default_value.has_value())
      {
        return std::get<T>(default_value.value());
      }
      eosio::check(false, "required attribute: " + attribute + " not found");
    }

    return std::get<T>(itr->second);
  }

  int64_t day_diff (const eosio::time_point & from, const eosio::time_point & to)
  {
    int64_t microseconds = to.time_since_epoch().count() - from.time_since_epoch().count();
    return microseconds / int64_t(86400000000);
  }

  namespace detail 
  {

    template<class T>
    struct supports_to_string
    {
      template<class U>
      static auto can_pass_to_string(const U* arg) -> decltype(std::to_string(*arg), char(0))
      {}

      static std::array<char, 2> can_pass_to_string(...) { }

      static constexpr bool value = (sizeof(can_pass_to_string((T*)0)) == 1);
    };

    template<class T>
    struct supports_call_to_string
    {
      template<class U>
      static auto can_pass_to_string(const U* arg) -> decltype(arg->to_string(), char(0))
      {}

      static std::array<char, 2> can_pass_to_string(...) { }

      static constexpr bool value = (sizeof(can_pass_to_string((T*)0)) == 1);
    };
    
    template<class T>
    std::string to_str_h(const T& arg)
    {
      if constexpr (supports_to_string<T>::value) {
        return std::to_string(arg);
      }
      else if constexpr (supports_call_to_string<T>::value) {
        return arg.to_string();
      }
      else if constexpr (std::is_same_v<T, eosio::checksum256>) {
        return readableHash(arg);
      }
      else if constexpr (std::is_same_v<T, class ContentGroup>) {

        std::string s;

        s = "ContentGroup {\n";

        for (auto& content : arg) {
          s += "\tContent " + content.toString() + "\n";
        }
        s += "}\n";

        return s;
      }
      else {
        return arg;
      }
    }
  }   
  
  //Helper function to convert 1+ X type variables to string
  template<class T, class...Args>
  std::string to_str(const T& first, const Args&... others)
  {
    return (detail::to_str_h(first) + ... + detail::to_str_h(others));
  }
}
