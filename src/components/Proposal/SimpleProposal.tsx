import type { Proposal } from '@/types/proposal'
import { FullHero } from '@/components/Proposal/FullHero'
import { BrandStatement } from '@/components/Proposal/BrandStatement'
import { AgentProfile } from '@/components/Proposal/AgentProfile'
import { RecentSales } from '@/components/Proposal/RecentSales'
import { FeeStructureVisual } from '@/components/Proposal/FeeStructureVisual'
import { ApprovalSection } from '@/components/Proposal/ApprovalSection'
import { Footer } from '@/components/Proposal/Footer'

/**
 * The "simple" client-facing proposal: a short, scannable page covering the
 * property/agent header, price guide + method, a trimmed set of comparable
 * sales, the fee + marketing cost, and the approve button — and nothing else.
 * Respects the same show/hide toggles as the full template.
 */
export function SimpleProposal({ proposal }: { proposal: Proposal }) {
  // Trim comparables to the most relevant few for a short page.
  const trimmedSales = (proposal.recentSales || []).slice(0, 4)

  return (
    <div className="min-h-screen">
      {/* Hero: property + address */}
      <FullHero proposal={proposal} />

      {/* Price guide + method of sale (respects showPriceRange) */}
      <BrandStatement proposal={proposal} />

      {/* Who the agent is */}
      <AgentProfile
        agent={proposal.agency ? {
          name: proposal.agency.agentName || proposal.agency.name,
          title: proposal.agency.agentTitle || 'Director',
          phone: proposal.agency.agentPhone || proposal.agency.contactPhone,
          email: proposal.agency.contactEmail,
          photoUrl: proposal.agency.agentPhoto,
          bio: proposal.agency.agentBio,
          yearsExperience: proposal.agency.agentYearsExperience,
        } : undefined}
        databaseInfo={proposal.databaseInfo}
      />

      {/* A few comparable sales to justify the price */}
      {trimmedSales.length > 0 && (
        <RecentSales sales={trimmedSales} proposalType={proposal.proposalType} />
      )}

      {/* Fees + marketing cost (respects showCommission) */}
      <FeeStructureVisual
        fees={proposal.fees}
        showCommission={proposal.showCommission !== false}
        methodOfSale={proposal.methodOfSale}
        proposalType={proposal.proposalType}
        managementFee={proposal.managementFee}
        lettingFee={proposal.lettingFee}
      />

      {/* Approve at the bottom */}
      <ApprovalSection proposal={proposal} />

      <Footer agency={proposal.agency} />
    </div>
  )
}
