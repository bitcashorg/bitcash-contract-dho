#include "../data_types.hpp"

#define DEFINE_REFERENDUMS_TABLE                                                                                                           \
  TABLE referendum_table                                                                                                                   \
  {                                                                                                                                        \
    uint64_t referendum_id;                                                                                                                \
    eosio::name creator;                                                                                                                   \
    eosio::time_point start_date;                                                                                                          \
    eosio::time_point end_date;                                                                                                            \
    eosio::name status;                                                                                                                    \
    eosio::asset quorum;                                                                                                                   \
    std::vector<common::types::day_percentage> quorum_config;                                                                              \
    std::vector<common::types::day_percentage> majority_config;                                                                            \
    eosio::asset votes_favour;                                                                                                              \
    eosio::asset votes_against;                                                                                                             \
    eosio::asset votes_abstain;                                                                                                             \
                                                                                                                                           \
    uint64_t primary_key() const { return referendum_id; }                                                                                 \
                                                                                                                                           \
    EOSLIB_SERIALIZE(referendum_table, (referendum_id)(creator)(start_date)(end_date)(status)(quorum)(quorum_config)(majority_config)(votes_favour)(votes_against)(votes_abstain)) \
  };                                                                                                                                       \
                                                                                                                                           \
  typedef eosio::multi_index<"referendums"_n, referendum_table> referendum_tables;
