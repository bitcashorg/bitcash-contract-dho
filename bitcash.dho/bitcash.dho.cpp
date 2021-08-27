#include <bitcash.dho.hpp>

constexpr uint64_t DAY = 60 * 60 * 24;

// config.period keys
namespace Period {
    constexpr name voting = "vot"_n;
}

// config.periods_config keys
namespace PeriodConfig {
    constexpr name voting_quorum = "vot.qrm"_n;
    constexpr name voting_approval = "vot.apr"_n;
}

// groups
namespace Groups {
    constexpr name accountants = "accountants"_n;
}

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


}

config bitcashdho::get_config() {
    if (configs.exists()) {
        return configs.get();
    }

    // default config
    return config {
        // periods
        map<name, uint64_t> {
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
