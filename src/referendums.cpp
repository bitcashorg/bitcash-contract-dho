#include <referendums.hpp>

ACTION referendums::reset()
{
  require_auth(get_self());

  // First, collect all referendum IDs before deleting the main table
  referendum_tables referendums_t(get_self(), get_self().value);
  std::vector<uint64_t> referendum_ids;
  
  for (auto itr = referendums_t.begin(); itr != referendums_t.end(); ++itr) {
    referendum_ids.push_back(itr->referendum_id);
  }
  
  // Clear the main referendum table
  util::delete_table<referendum_tables>(get_self(), get_self().value);

  // Clean up vote tables for all actual referendum IDs
  for (uint64_t referendum_id : referendum_ids) {
    util::delete_table<vote_tables>(get_self(), referendum_id);
  }
}

ACTION referendums::create(
    const uint64_t &referendum_id,
    const eosio::name &creator,
    const eosio::time_point &start_date,
    const eosio::time_point &end_date,
    const eosio::asset &quorum,
    std::vector<common::types::day_percentage> &quorum_config,
    std::vector<common::types::day_percentage> &majority_config)
{
  // Allow either contract self or proposals contract to create referendums
  if (!has_auth(get_self())) {
    require_auth(common::contracts::proposals);
  }

  referendum_tables referendums_t(get_self(), get_self().value);

  eosio::time_point now = eosio::current_time_point();

  eosio::check(start_date >= now, "can not create a referendum in the past");
  eosio::check(end_date >= start_date, "end date must be greater or equal than the start date " + start_date.to_string() + " " + end_date.to_string());
  eosio::check(quorum.symbol == common::token_symbol,
               "quorum symbol must be " + common::token_symbol.code().to_string());
  eosio::check(quorum.symbol.precision() <= 18, "Asset precision must be 18 or less");
  eosio::check(quorum.amount >= 0, "quorum must be non-negative");
  
  // Validate referendum duration (should be reasonable)
  int64_t duration_seconds = end_date.sec_since_epoch() - start_date.sec_since_epoch();
  int64_t duration_days = duration_seconds / 86400;
  eosio::check(duration_days >= 1 && duration_days <= 30, "referendum duration must be between 1 and 30 days");
  check_day_percentage(quorum_config, std::string("quorum config"));
  check_day_percentage(majority_config, std::string("majority config"));

  referendums_t.emplace(_self, [&](auto &item)
                        {
    item.referendum_id = referendum_id;
    item.creator = creator;
    item.start_date = start_date;
    item.end_date = end_date;
    item.status = common::referendums::status_created;
    item.quorum = quorum;
    item.quorum_config = quorum_config;
    item.majority_config = majority_config;
    item.votes_favour = eosio::asset(0, common::token_symbol);
    item.votes_against = eosio::asset(0, common::token_symbol);
    item.votes_abstain = eosio::asset(0, common::token_symbol); });
  // auto refRow = referendums_t.find(referendum_id);
  // eosio::check(refRow != referendums_t.end(), "referendum not found");
  // eosio::check(false,"Referendum created: "+ std::to_string(refRow->quorum.symbol.precision()) + " " + refRow->quorum.symbol.code().to_string());

}

ACTION referendums::start(const uint64_t &referendum_id)
{
  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::name auth = check_authority(ritr->creator);

  eosio::check(ritr->status == common::referendums::status_created,
               "can not start referendum, it is not in " + common::referendums::status_created.to_string() + " status");

  eosio::time_point now = eosio::current_time_point();
  if (auth != get_self()) {
    eosio::check(ritr->start_date <= now, "can not start referendum, it is too soon");
  }

  referendums_t.modify(ritr, _self, [&](auto &item)
                       { item.status = common::referendums::status_started; });
}

ACTION referendums::hold(const uint64_t &referendum_id)
{
  require_auth(get_self());

  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::check(ritr->status == common::referendums::status_started,
               "can not finish referendum, it is not in " + common::referendums::status_started.to_string() + " status");

  referendums_t.modify(ritr, _self, [&](auto &item)
                       { item.status = common::referendums::status_hold; });
}

ACTION referendums::resume(const uint64_t &referendum_id)
{
  require_auth(get_self());

  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::check(ritr->status == common::referendums::status_hold,
               "can not resume referendum, it is not in " + common::referendums::status_hold.to_string() + " status");

  referendums_t.modify(ritr, _self, [&](auto &item)
                       { item.status = common::referendums::status_started; });
}

ACTION referendums::finish(const uint64_t &referendum_id)
{
  referendum_tables referendums_t(get_self(), get_self().value);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::name auth = check_authority(ritr->creator);

  eosio::time_point now = eosio::current_time_point();

  if (auth != get_self())
  {
    eosio::check(ritr->end_date <= now, "can not finish referendum, it is too soon");
  }
  else
  {
    // Even contract should have reasonable limits - prevent finishing way too early
    eosio::time_point min_duration = ritr->start_date + eosio::microseconds(24 * 60 * 60 * 1000000); // 24 hours minimum
    eosio::check(now >= min_duration, "referendum must run for at least 24 hours before contract can finish it");
  }

  eosio::check(ritr->status == common::referendums::status_started,
               "can not hold referendum, it is not in " + common::referendums::status_started.to_string() + " status");

  eosio::asset favour = ritr->votes_favour;
  eosio::asset against = ritr->votes_against;
  eosio::asset abstain = ritr->votes_abstain;

  // ========================================================= //
  // eosio::check THE TOKEN SUPPLY, WE MIGHT HAVE TO ADDAPT THIS FOR THE TOKEN CONTRACT WHEN IT IS READY

  stats token_stats_t(common::contracts::bank_token, common::token_symbol.code().raw());
  auto stat_itr = token_stats_t.require_find(common::token_symbol.code().raw(), (common::token_symbol.code().to_string() + " token does not exist").c_str());

  eosio::asset current_supply = stat_itr->supply;

  // ========================================================= //

  // Old quorum based on percentage instead of absolute value
  // int64_t quorum_threshold_percentage = int64_t(get_current_percentage(ritr->quorum_config, ritr->start_date, now));
  // int64_t current_quorum_percentage = ((favour.amount + against.amount + abstain.amount) * 10000) / current_supply.amount;
  // bool quorum_passed = current_quorum_percentage >= quorum_threshold_percentage;

  // Check for overflow in quorum calculation before adding vote amounts
  eosio::check(favour.amount <= (INT64_MAX - against.amount), "vote amounts too large for quorum calculation");
  eosio::check((favour.amount + against.amount) <= (INT64_MAX - abstain.amount), "vote amounts too large for quorum calculation");
  
  bool quorum_passed = (favour.amount + against.amount + abstain.amount) >= ritr->quorum.amount;

  int64_t majority_threshold_percentage = int64_t(get_current_percentage(ritr->majority_config, ritr->start_date, now));

  int64_t current_majority_percentage = 0;
  bool majority_passed = false;
  
  // Calculate majority based on favour vs against votes (abstain votes don't count for majority)
  int64_t denom = favour.amount + against.amount;
  if (denom > 0) {
      // Prevent overflow: check if favour.amount * 10000 would overflow
      eosio::check(favour.amount <= (INT64_MAX / 10000), "vote amount too large for percentage calculation");
      current_majority_percentage = (favour.amount * 10000) / denom;
      majority_passed = current_majority_percentage >= majority_threshold_percentage;
  } else {
      // If only abstain votes, referendum fails (no clear majority decision)
      majority_passed = false;
  }

  referendums_t.modify(ritr, _self, [&](auto &item)
                       { item.status = (quorum_passed && majority_passed) ? common::referendums::status_accepted : common::referendums::status_rejected; });
}

ACTION referendums::vote(const uint64_t &referendum_id, const eosio::name &voter, const eosio::name &option)
{
  require_auth(voter);

  eosio::check(option == common::referendums::vote_favour || option == common::referendums::vote_against || option == common::referendums::vote_abstain,
               "invalid vote option, it must be one of " + common::referendums::vote_favour.to_string() + ", " + common::referendums::vote_against.to_string() + ", " + common::referendums::vote_abstain.to_string());

  referendum_tables referendums_t(get_self(), get_self().value);
  vote_tables votes_t(get_self(), referendum_id);

  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  eosio::check(ritr->status == common::referendums::status_started,
               "can not vote, referendum is not in started status");

  auto vitr = votes_t.find(voter.value);
  eosio::check(vitr == votes_t.end(), "only one vote per account is allowed");

  token_account_tables token_accts_t(common::contracts::bank_token, voter.value);
  auto balance_itr = token_accts_t.find(common::token_symbol.code().raw());

  eosio::check(balance_itr != token_accts_t.end(), "voter does not have " + common::token_symbol.code().to_string());
  eosio::check(balance_itr->balance.amount > 0, "token balance must be greater than zero");

  eosio::asset vote_amount = balance_itr->balance;

  votes_t.emplace(_self, [&](auto &item)
                  {
    item.voter = voter;
    item.amount = vote_amount;  // Store full asset for flexibility
    item.option = option;
    item.weight = common::referendums::default_vote_weight; });

  referendums_t.modify(ritr, _self, [&](auto &item)
                       { 
    if (option == common::referendums::vote_favour) {
      item.votes_favour += vote_amount;
    } else if (option == common::referendums::vote_against) {
      item.votes_against += vote_amount;
    } else if (option == common::referendums::vote_abstain) {
      item.votes_abstain += vote_amount;
    } else {
      eosio::check(false, "invalid vote option");
    } });
}

ACTION referendums::clearvote(const uint64_t &referendum_id, const eosio::name &voter)
{
  require_auth(voter);

  referendum_tables referendums_t(get_self(), get_self().value);
  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  // Only allow cleanup after referendum is finished (helps contract manage RAM)
  eosio::check(ritr->status == common::referendums::status_accepted || 
               ritr->status == common::referendums::status_rejected,
               "can only clear vote after referendum is finished");

  vote_tables votes_t(get_self(), referendum_id);
  auto vitr = votes_t.require_find(voter.value, "vote not found for this account");

  votes_t.erase(vitr);
}

ACTION referendums::cleanupref(const uint64_t &referendum_id)
{
  require_auth(get_self());

  referendum_tables referendums_t(get_self(), get_self().value);
  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  // Only allow cleanup after referendum is finished
  eosio::check(ritr->status == common::referendums::status_accepted || 
               ritr->status == common::referendums::status_rejected,
               "can only cleanup after referendum is finished");

  // Check that referendum has been finished for at least 7 days
  eosio::time_point now = eosio::current_time_point();
  eosio::time_point cleanup_threshold = eosio::time_point(eosio::microseconds(
    ritr->end_date.time_since_epoch().count() + (7 * common::microseconds_per_day)
  ));
  eosio::check(now >= cleanup_threshold, "must wait at least 7 days after referendum end before cleanup");

  // Clear all votes for this referendum
  vote_tables votes_t(get_self(), referendum_id);
  auto vote_itr = votes_t.begin();
  while (vote_itr != votes_t.end()) {
    vote_itr = votes_t.erase(vote_itr);
  }

  // Remove the referendum itself
  referendums_t.erase(ritr);
}

ACTION referendums::cleanupold(const uint32_t &days_old)
{
  require_auth(get_self());

  eosio::check(days_old >= 30, "cannot cleanup referendums less than 30 days old");

  referendum_tables referendums_t(get_self(), get_self().value);
  eosio::time_point now = eosio::current_time_point();
  eosio::time_point cutoff_time = eosio::time_point(eosio::microseconds(
    now.time_since_epoch().count() - (days_old * common::microseconds_per_day)
  ));

  std::vector<uint64_t> to_cleanup;
  const uint32_t max_batch_size = 50; // Limit to 50 referendums per transaction

  // Find old finished referendums
  for (auto itr = referendums_t.begin(); itr != referendums_t.end() && to_cleanup.size() < max_batch_size; ++itr) {
    bool is_finished = (itr->status == common::referendums::status_accepted || 
                       itr->status == common::referendums::status_rejected);
    
    if (is_finished && itr->end_date <= cutoff_time) {
      to_cleanup.push_back(itr->referendum_id);
    }
  }

  // Clean up identified referendums
  for (uint64_t referendum_id : to_cleanup) {
    auto ref_itr = referendums_t.find(referendum_id);
    if (ref_itr != referendums_t.end()) {
      
      // Clear all votes for this referendum
      vote_tables votes_t(get_self(), referendum_id);
      auto vote_itr = votes_t.begin();
      while (vote_itr != votes_t.end()) {
        vote_itr = votes_t.erase(vote_itr);
      }
      
      // Remove the referendum
      referendums_t.erase(ref_itr);
    }
  }
}

void referendums::check_day_percentage(std::vector<common::types::day_percentage> &day_per, const std::string &category)
{
  eosio::check(day_per.size() > 0, category + " must have at least one entry");
  eosio::check(day_per[0].percentage <= 10000, category + " percentage must be <= 10000");
  auto dp = day_per[0];

  for (int i = 1; i < day_per.size(); i++)
  {
    eosio::check(day_per[i].start_day > dp.start_day, category + " start dates must be in increasing order");
    eosio::check(day_per[i].percentage < dp.percentage, category + " percentages must be in decreasing order");
    eosio::check(day_per[i].percentage <= 10000, category + " percentage must be <= 10000");
    dp = day_per[i];
  }
}

uint16_t referendums::get_current_percentage(
    const std::vector<common::types::day_percentage> &day_per,
    const eosio::time_point &start_day,
    const eosio::time_point &cutoff)
{
  eosio::check(cutoff >= start_day, "start day is in the future");

  uint32_t num_days = (cutoff.sec_since_epoch() - start_day.sec_since_epoch()) / 86400;

  for (auto &dp : day_per)
  {
    if (num_days <= dp.start_day)
    {
      return dp.percentage;
    }
  }

  return (day_per.back()).percentage;
}

eosio::name referendums::check_authority(const eosio::name &account)
{
  eosio::name auth = eosio::has_auth(account)
                        ? account
                        : (eosio::has_auth(common::contracts::proposals) ? common::contracts::proposals : get_self());
  require_auth(auth);
  return auth;
}
