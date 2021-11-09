#pragma once

#include <eosio/system.hpp>

namespace common
{
  namespace types
  {
    struct day_percentage
    {
      uint16_t start_day;
      uint16_t percentage;
    };
  }
}
