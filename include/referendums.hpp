#include <eosio/asset.hpp>
#include <eosio/eosio.hpp>
#include <util.hpp>
#include <common/tables/referendums.hpp>
#include <common/tables/token_stats.hpp>
#include <common/tables/token_account.hpp>
#include <common/data_types.hpp>
#include <common/constants.hpp>

CONTRACT referendums : public eosio::contract
{

public:
  using contract::contract;
  referendums(eosio::name receiver, eosio::name code, eosio::datastream<const char *> ds)
      : contract(receiver, code, ds)
  {
  }

  ACTION reset();

  ACTION create(
      const uint64_t &referendum_id,
      const eosio::name &creator,
      const eosio::time_point &start_date,
      const eosio::time_point &end_date,
      const eosio::asset &quorum,
      std::vector<common::types::day_percentage> &quorum_config,
      std::vector<common::types::day_percentage> &majority_config);

  ACTION start(const uint64_t &referendum_id);

  ACTION hold(const uint64_t &referendum_id);

  ACTION resume(const uint64_t &referendum_id);

  ACTION finish(const uint64_t &referendum_id);

  ACTION vote(const uint64_t &referendum_id, const eosio::name &voter, const eosio::name &option);

  ACTION clearvote(const uint64_t &referendum_id, const eosio::name &voter);

  ACTION cleanupref(const uint64_t &referendum_id);

  ACTION cleanupold(const uint32_t &days_old);

  // Batched cleanup for votes and referendums
  ACTION cleanupvotes(const uint64_t &referendum_id, const uint32_t &max_rows);
  ACTION cleanuprefs(const uint32_t &max_rows);

private:
  void check_day_percentage(std::vector<common::types::day_percentage> & day_per, const std::string &category);
  uint16_t get_current_percentage(const std::vector<common::types::day_percentage> &day_per, const eosio::time_point &start_day, const eosio::time_point &cutoff);
  eosio::name check_authority(const eosio::name &account);

  DEFINE_REFERENDUMS_TABLE

  DEFINE_TOKEN_STATS

  DEFINE_TOKEN_ACCOUNT

  TABLE vote_table
  { // scoped by referendum_id
    eosio::name voter;
    eosio::asset amount;   // Keep full asset for multi-token flexibility
    eosio::name option;
    uint32_t weight;

    uint64_t primary_key() const { return voter.value; }
    uint64_t by_option() const { return option.value; }

    EOSLIB_SERIALIZE(vote_table, (voter)(amount)(option)(weight))
  };
  typedef eosio::multi_index<"votes"_n, vote_table,
    eosio::indexed_by<"byoption"_n, eosio::const_mem_fun<vote_table, uint64_t, &vote_table::by_option>>
  > vote_tables;

};
