#pragma once
#include <tables/proposal.hpp>

namespace proposal {
    class proposal {
        public:

        virtual void phase_draft(const tables::proposal& proposal) {

        }

        virtual void phase_debate(const tables::proposal& proposal) {

        }

        virtual void phase_voting(const tables::proposal& proposal) {

        }

        virtual void phase_accepted(const tables::proposal& proposal) {

        }

        virtual void phase_rejected(const tables::proposal& proposal) {

        }

    };
}
