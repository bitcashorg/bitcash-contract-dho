#include "../data_types.hpp"

using namespace eosio;

#define DEFINE_PROPOSALS_TABLE                                                                                       \
  TABLE proposal_table                                                                                               \
  {                                                                                                                  \
    uint64_t proposal_id;                                                                                            \
    eosio::name creator;                                                                                             \
    eosio::name type;                                                                                                \
    eosio::time_point deadline;                                                                                      \
    eosio::name status;                                                                                              \
    eosio::name current_phase;                                                                                       \
    std::vector<common::types::phase> phases;                                                                        \
    uint64_t parent;                                                                                                 \
    std::vector<uint64_t> awaiting;                                                                                  \
    std::map<std::string, common::types::variant_value> special_attributes;                                          \
                                                                                                                     \
    uint64_t primary_key() const                                                                                     \
    {                                                                                                                \
      return proposal_id;                                                                                            \
    }                                                                                                                \
    uint128_t by_status_id() const                                                                                   \
    {                                                                                                                \
      return (uint128_t(status.value) << 64) + proposal_id;                                                          \
    }                                                                                                                \
    uint128_t by_status_type() const                                                                                 \
    {                                                                                                                \
      return (uint128_t(type.value) << 64) + proposal_id;                                                            \
    }                                                                                                                \
    uint128_t by_parent_status() const                                                                               \
    {                                                                                                                \
      return (uint128_t(parent) << 64) + status.value;                                                               \
    }                                                                                                                \
    uint128_t by_parent_current_phase() const                                                                        \
    {                                                                                                                \
      return (uint128_t(parent) << 64) + current_phase.value;                                                        \
    }                                                                                                                \
    uint128_t by_parent_type() const                                                                                 \
    {                                                                                                                \
      return (uint128_t(parent) << 64) + type.value;                                                                 \
    }                                                                                                                \
                                                                                                                     \
    EOSLIB_SERIALIZE(                                                                                                \
        proposal_table,                                                                                              \
        (proposal_id)(creator)(type)(deadline)(status)(current_phase)(phases)(parent)(awaiting)(special_attributes)) \
  };

#define DEFINE_PROPOSALS_TABLE_MULTI_INDEX                                                                                                   \
  typedef eosio::multi_index<"proposals"_n, proposal_table,                                                                                  \
                             indexed_by<"bystatusid"_n, const_mem_fun<proposal_table, uint128_t, &proposal_table::by_status_id>>,            \
                             indexed_by<"bystatustype"_n, const_mem_fun<proposal_table, uint128_t, &proposal_table::by_status_type>>,        \
                             indexed_by<"byprntstat"_n, const_mem_fun<proposal_table, uint128_t, &proposal_table::by_parent_status>>,        \
                             indexed_by<"byprntphse"_n, const_mem_fun<proposal_table, uint128_t, &proposal_table::by_parent_current_phase>>, \
                             indexed_by<"byprnttype"_n, const_mem_fun<proposal_table, uint128_t, &proposal_table::by_parent_type>>>          \
      proposal_tables;
