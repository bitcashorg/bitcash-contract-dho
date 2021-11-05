#include <eosio/asset.hpp>
#include <eosio/eosio.hpp>
#include <util.hpp>


using namespace eosio;


CONTRACT referendums : public contract {

  public:
    using contract::contract;
    referendums(name receiver, name code, datastream<const char*> ds)
      : contract(receiver, code, ds)
        {}

    ACTION reset();

};
