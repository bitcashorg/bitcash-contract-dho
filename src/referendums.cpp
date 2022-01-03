#include <referendums.hpp>

ACTION referendums::reset ()
{
  require_auth(get_self());

  util::delete_table<referendum_tables>(get_self(), get_self().value);

  for (uint64_t i = 0; i < 10; i++)
  {
    util::delete_table<vote_tables>(get_self(), i);
  }
}


ACTION referendums::create (
  const uint64_t & referendum_id,
  const eosio::name & creator,
  const eosio::time_point & start_date,
  const eosio::time_point & end_date,
  std::vector<common::types::day_percentage> & quorum_config,
  std::vector<common::types::day_percentage> & majority_config
)
{
  require_auth(get_self());

  referendum_tables referendums_t(get_self(), get_self().value);

  eosio::time_point now = eosio::current_time_point();

  eosio::check(start_date >= now, "can not create a referendum in the past");
  eosio::check(end_date >= start_date, "end date must be greater or equal than the start date");

  check_day_percentage(quorum_config, std::string("quorum config"));
  check_day_percentage(majority_config, std::string("majority config"));

  referendums_t.emplace(_self, [&](auto & item){
    item.referendum_id = referendum_id;
    item.creator = creator;
    item.start_date = start_date;
    item.end_date = end_date;
    item.status = common::referendums::status_created;
    item.quorum_config = quorum_config;
    item.majority_config = majority_config;
    item.vote_tally = {
      std::make_pair(common::referendums::vote_favour, eosio::asset(0, common::token_symbol)),
      std::make_pair(common::referendums::vote_against, eosio::asset(0, common::token_symbol)),
      std::make_pair(common::referendums::vote_abstain, eosio::asset(0, common::token_symbol))
    };
  });
}


ACTION referendums::start (const uint64_t & referendum_id)
{
  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  check_authority(ritr->creator);

  eosio::check(ritr->status == common::referendums::status_created, 
    "can not start referendum, it is not in " + common::referendums::status_created.to_string() + " status");

  eosio::time_point now = eosio::current_time_point();
  eosio::check(ritr->start_date <= now, "can not start referendum, it is too soon");

  referendums_t.modify(ritr, _self, [&](auto & item){
    item.status = common::referendums::status_started;
  });
}


ACTION referendums::hold (const uint64_t & referendum_id)
{
  require_auth(get_self());

  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::check(ritr->status == common::referendums::status_started, 
    "can not hold referendum, it is not in " + common::referendums::status_started.to_string() +  " status");

  referendums_t.modify(ritr, _self, [&](auto & item){
    item.status = common::referendums::status_hold;
  });
}


ACTION referendums::resume (const uint64_t & referendum_id)
{
  require_auth(get_self());

  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::check(ritr->status == common::referendums::status_hold, 
    "can not resume referendum, it is not in " + common::referendums::status_hold.to_string() +  " status");

  referendums_t.modify(ritr, _self, [&](auto & item){
    item.status = common::referendums::status_started;
  });
}


ACTION referendums::finish (const uint64_t & referendum_id)
{
  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::name auth = check_authority(ritr->creator);

  eosio::time_point now = eosio::current_time_point();

  if (auth != get_self())
  {
    eosio::check(ritr->end_date <= now, "can not finish referendum, it is too soon");
  }

  eosio::check(ritr->status == common::referendums::status_started,
    "can not hold referendum, it is not in " + common::referendums::status_started.to_string() +  " status");

  eosio::asset favour = ritr->vote_tally.at(common::referendums::vote_favour);
  eosio::asset against = ritr->vote_tally.at(common::referendums::vote_against);
  eosio::asset abstain = ritr->vote_tally.at(common::referendums::vote_abstain);


  // ========================================================= //
  // eosio::check THE TOKEN SUPPLY, WE MIGHT HAVE TO ADDAPT THIS FOR THE TOKEN CONTRACT WHEN IT IS READY

  stats token_stats_t(common::contracts::bank_token, common::token_symbol.code().raw());
  auto stat_itr = token_stats_t.require_find(common::token_symbol.code().raw(), (common::token_symbol.code().to_string() + " token does not exist").c_str());

  eosio::asset current_supply = stat_itr->supply;

  // ========================================================= //


  int64_t quorum_threshold_percentage = int64_t(get_current_percentage(ritr->quorum_config, ritr->start_date, now));
  int64_t current_quorum_percentage = ((favour.amount + against.amount + abstain.amount) * 10000) / current_supply.amount;
  bool quorum_passed = current_quorum_percentage >= quorum_threshold_percentage;

  int64_t majority_threshold_percentage = int64_t(get_current_percentage(ritr->majority_config, ritr->start_date, now));
  int64_t current_majority_percentage = (favour.amount * 10000) / (favour.amount + against.amount);
  bool majority_passed = current_majority_percentage >= majority_threshold_percentage;

  referendums_t.modify(ritr, _self, [&](auto & item){
    item.status = (quorum_passed && majority_passed) ? common::referendums::status_accepted : common::referendums::status_rejected;
  });
}


ACTION referendums::vote (const uint64_t & referendum_id, const eosio::name & voter, const eosio::name & option)
{
  require_auth(voter);

  eosio::check(option == common::referendums::vote_favour || option == common::referendums::vote_against || option == common::referendums::vote_abstain,
    "invalid vote option, it must be one of " + common::referendums::vote_favour.to_string() + ", " + common::referendums::vote_against.to_string()
    + ", " + common::referendums::vote_abstain.to_string());

  referendum_tables referendums_t(get_self(), get_self().value);
  vote_tables votes_t(get_self(), referendum_id);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");
  
  auto vitr = votes_t.find(voter.value);
  eosio::check(vitr == votes_t.end(), "only one vote per account is allowed");

  token_account_tables token_accts_t(common::contracts::bank_token, voter.value);
  auto balance_itr = token_accts_t.find(common::token_symbol.code().raw());
  
  eosio::check(balance_itr != token_accts_t.end(), "voter does not have " + common::token_symbol.code().to_string());
  eosio::check(balance_itr->balance.amount > 0, "token balance must be greater than zero");

  eosio::asset vote_amount = balance_itr->balance;

  votes_t.emplace(_self, [&](auto & item){
    item.voter = voter;
    item.amount = vote_amount;
    item.option = option;
    item.weight = 10000;
  });

  referendums_t.modify(ritr, _self, [&](auto & item){
    item.vote_tally.at(option) += vote_amount;
  });
}


void referendums::check_day_percentage (std::vector<common::types::day_percentage> & day_per, const std::string & category)
{
  eosio::check(day_per.size() > 0, category + " must have at least one entry");
  auto dp = day_per[0];

  for (int i = 1; i < day_per.size(); i++)
  {
    eosio::check(day_per[i].start_day > dp.start_day, category + " start dates must be in increasing order");
    eosio::check(day_per[i].percentage < dp.percentage, category + " percentages must be in decreasing order");
    dp = day_per[i];
  }
}

uint16_t referendums::get_current_percentage (
  const std::vector<common::types::day_percentage> & day_per,
  const eosio::time_point & start_day,
  const eosio::time_point & cutoff
)
{
  eosio::check(cutoff >= start_day, "start day is in the future");

  uint32_t num_days = (cutoff.sec_since_epoch() - start_day.sec_since_epoch()) / 86400;

  for (auto & dp : day_per)
  {
    if (num_days <= dp.start_day)
    {
      return dp.percentage;
    }
  }

  return (day_per.back()).percentage;
}

eosio::name referendums::check_authority (const eosio::name & account)
{
  eosio::name auth = eosio::has_auth(account) ? account : get_self();
  require_auth(auth);
  return auth;
}
