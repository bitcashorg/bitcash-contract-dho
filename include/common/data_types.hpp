#pragma once

#include <eosio/system.hpp>
#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>

namespace common
{
  namespace types
  {
    typedef std::variant<std::monostate, int64_t, double, eosio::name, eosio::asset, std::string, bool, eosio::time_point> variant_value; 

    struct day_percentage
    {
      uint16_t start_day;
      uint16_t percentage;
    };

    struct phase
    {
      eosio::name phase;
      int16_t duration_days;
      eosio::name type;
      eosio::time_point start_date;
      eosio::time_point end_date;
    };

    struct phase_config
    {
      eosio::name phase_name;
      int16_t duration_days;
      eosio::name type;
    };
    
    struct factory {
      static phase create_phase_entry (
        eosio::name phase_name, 
        int16_t duration_days, 
        eosio::name type,
        std::optional<eosio::time_point> start_date = std::nullopt,
        std::optional<eosio::time_point> end_date = std::nullopt
      )
      {
        eosio::time_point null_time_point = eosio::time_point(eosio::microseconds(0));
        return phase {
          .phase = phase_name,
          .duration_days = duration_days,
          .type = type,
          .start_date = start_date.value_or(null_time_point),
          .end_date = end_date.value_or(null_time_point)
        };
      }
    };
  }
}
