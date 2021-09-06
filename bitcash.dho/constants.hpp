#pragma once

constexpr uint64_t DAY = 60 * 60 * 24;

// config.period keys
namespace Period {
    constexpr name debate = "deb"_n;
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

namespace UIntConfig {
    constexpr name phase_start = "phase.start"_n;
    constexpr name phase_end = "phase.end"_n;
}

namespace ProposalPhase {
    constexpr name draft      = "draft"_n;
    constexpr name debate     = "debate"_n;
    constexpr name voting     = "voting"_n;
    constexpr name rejected   = "rejected"_n;
    constexpr name accepted   = "accepted"_n;
}

namespace ProposalType {
    constexpr name main       = "main"_n;
}

constexpr uint64_t NULL_PROPOSAL_ID = 0;
