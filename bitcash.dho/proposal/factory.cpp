#include <proposal/factory.hpp>
#include <proposal/proposal_main.hpp>
#include <constants.hpp>

namespace proposal {
    std::shared_ptr<proposal> factory::get(tables::proposal& in_proposal) {
        switch(in_proposal.type.value) {
            case ProposalType::main.value:
                return std::shared_ptr<proposal>(new proposal_main());
            break;
        }
        check(false, "Proposal type not implemented");

        return nullptr;
    }

    void factory::run_phase(tables::proposal& in_proposal) {
        std::shared_ptr<proposal> p = get(in_proposal);
        switch (in_proposal.phase.value) {
            case ProposalPhase::draft.value:
                p->phase_draft(in_proposal);
                break;
            case ProposalPhase::debate.value:
                p->phase_debate(in_proposal);
                break;
            case ProposalPhase::voting.value:
                p->phase_voting(in_proposal);
                break;
            case ProposalPhase::accepted.value:
                p->phase_accepted(in_proposal);
                break;
            case ProposalPhase::rejected.value:
                p->phase_rejected(in_proposal);
                break;
        }

        check(false, "Proposal phase implemented");
    }
}