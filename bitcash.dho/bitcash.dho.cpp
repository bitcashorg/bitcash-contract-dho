#include <bitcash.dho.hpp>
#include <constants.hpp>
#include <proposal/factory.hpp>

bitcashdho::bitcashdho(name receiver, name code, datastream<const char*> ds)
    : contract::contract(receiver, code, ds),
      configs(get_self(), get_self().value), 
      proposals(get_self(), get_self().value)
{
    
}

void bitcashdho::addproposal(
        const name& author,
        const string& title,
        const string& description,
        const string& kpi,
        const asset& budget,
        const uint64_t& deadline
    ) {
    require_auth(author);

    uint64_t primary_key = available_proposal_id();
    proposals.emplace(get_self(), [&](auto& proposal) {
        proposal.id = primary_key;
        proposal.author = author;
        proposal.title = title;
        proposal.description = description;
        proposal.kpi = kpi;
        proposal.budget = budget;
        proposal.deadline = deadline;

        proposal.phase = ProposalPhase::draft;
        proposal.type = ProposalType::main;
        proposal.parent_proposal = 0;
        
        proposal::factory::run_phase(proposal);
    });
}

void bitcashdho::updateprop(
        const uint64_t& proposal_id,
        const optional<string>& title,
        const optional<string>& description,
        const optional<string>& kpi,
        const optional<asset>& budget,
        const optional<uint64_t>& deadline
    ) {
    auto proposal = require_proposal_author(proposal_id);
    check(proposal->phase == ProposalPhase::draft, "Only draft proposals can be updated directly");
    
    proposals.modify(proposal, get_self(), [&](auto& proposal) {
        proposal.title = title.value_or(proposal.title);
        proposal.description = description.value_or(proposal.description);
        proposal.kpi = kpi.value_or(proposal.kpi);
        proposal.budget = budget.value_or(proposal.budget);
        proposal.deadline = deadline.value_or(proposal.deadline);
    });
}

void bitcashdho::startdebate(const uint64_t& proposal_id) {
    auto proposal = require_proposal_author(proposal_id);

    auto config = get_config();

    proposals.modify(proposal, get_self(), [&](auto proposal) {
        const uint64_t start = eosio::current_time_point().sec_since_epoch();
        proposal.phase = ProposalPhase::debate;
        proposal.uint_config[UIntConfig::phase_start] = start;
        proposal.uint_config[UIntConfig::phase_end] = start + config.periods[Period::debate];
    });
}

void bitcashdho::startvoting(const uint64_t& proposal_id) {
    auto proposal = require_proposal_author(proposal_id);
}

void bitcashdho::closevoting(const uint64_t& proposal_id) {
    auto proposal = require_proposal_author(proposal_id);
}
