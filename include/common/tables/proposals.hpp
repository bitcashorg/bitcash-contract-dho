#include "../data_types.hpp"

#define DEFINE_PROPOSALS_TABLE TABLE proposal_table { \
    uint64_t proposal_id; \
    eosio::name creator; \
    eosio::name type; \
    std::string title; \
    std::string description; \
    std::string kpi; \
    eosio::time_point deadline; \
    eosio::name current_phase; \
    std::vector<common::types::phase> phases; \
    uint64_t parent; \
    std::vector<uint64_t> awaiting; \
    std::map<std::string, common::types::variant_value> special_attributes; \
\
    uint64_t primary_key () const { return proposal_id; } \
\
    EOSLIB_SERIALIZE( \
      proposal_table, \
      (proposal_id)(creator)(type)(title)(description)(kpi)(deadline) \
      (current_phase)(phases)(parent)(awaiting)(special_attributes) \
    ) \
  }; \
\
  typedef eosio::multi_index<"proposals"_n, proposal_table> proposal_tables;
