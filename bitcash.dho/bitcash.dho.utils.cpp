#include <bitcash.dho.hpp>
#include <constants.hpp>

tables::config bitcashdho::get_config() {
    if (configs.exists()) {
        return configs.get();
    }

    // default config
    return tables::config {
        // periods
        map<name, uint64_t> {
            { Period::debate, 10 * DAY },
            { Period::voting, 10 * DAY }
        },
        // periods_config 
        map<name, vector<pair<uint64_t, uint8_t>>>
        {
            { PeriodConfig::voting_quorum, {
                { 10 * DAY, 30 }
            }},
            { PeriodConfig::voting_approval, {
                { 10 * DAY, 60 }
            }}
        },
        // groups
        {
            { Groups::accountants, {
                // empty
            } }
        }
    };
}

uint64_t bitcashdho::available_proposal_id() {
    uint64_t pk = proposals.available_primary_key();
    if (pk == NULL_PROPOSAL_ID) {
        ++pk;
    }

    return pk;
}

tables::proposals::const_iterator bitcashdho::require_proposal_author(const uint64_t& proposal_id) {
    auto proposal = proposals.require_find(proposal_id, "Proposal does not exist");
    require_auth(proposal->author);
    return proposal;
}