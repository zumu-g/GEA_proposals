import type { Proposal } from '@/types/proposal'
import { getPropertyTypeContent } from '@/lib/property-type-content'
import { getDefaultProposalExtras, DEFAULT_TOTAL_ADVERTISING_COST, DEFAULT_AGENCY_CONFIG } from '@/lib/proposal-generator'
import { FullHero } from '@/components/Proposal/FullHero'
import { Introduction } from '@/components/Proposal/Introduction'
import { BrandStatement } from '@/components/Proposal/BrandStatement'
import { OffMarketStage } from '@/components/Proposal/OffMarketStage'
import { AgentProfile } from '@/components/Proposal/AgentProfile'
import { RecentSales } from '@/components/Proposal/RecentSales'
import { AdvertisingSchedule } from '@/components/Proposal/AdvertisingSchedule'
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

  // Property-type copy/visibility — rentals resolve to the house baseline.
  const typeContent = getPropertyTypeContent(proposal.proposalType === 'rental' ? undefined : proposal.propertyType)

  // Agent details fall back to the built-in agency config so the intro always shows.
  const agency = proposal.agency || DEFAULT_AGENCY_CONFIG

  return (
    <div className="min-h-screen">
      {/* Hero: property + address */}
      <FullHero proposal={proposal} />

      {/* Welcome / introduction — same as the full layout */}
      <Introduction proposal={proposal} />

      {/* Price guide + method of sale (respects showPriceRange) */}
      <BrandStatement proposal={proposal} statementOverride={typeContent.copy.brandStatement} />

      {/* Off-market stage one (compact) */}
      {proposal.offMarketCampaign && proposal.proposalType !== 'rental' && <OffMarketStage variant="compact" />}

      {/* Who the agent is — always rendered with intro text, falling back to agency defaults */}
      <AgentProfile
        agent={{
          name: agency.agentName || agency.name,
          title: agency.agentTitle || 'Director',
          phone: agency.agentPhone || agency.contactPhone,
          email: agency.contactEmail,
          photoUrl: agency.agentPhoto,
          bio: agency.agentBio || DEFAULT_AGENCY_CONFIG.agentBio,
          yearsExperience: agency.agentYearsExperience,
        }}
        databaseInfo={proposal.databaseInfo}
      />

      {/* A few comparable sales to justify the price */}
      {trimmedSales.length > 0 && (
        <RecentSales sales={trimmedSales} proposalType={proposal.proposalType} showBedsBaths={typeContent.showsBedsBaths} />
      )}

      {/* Marketing plan + costs — same schedule as the full layout */}
      {!(proposal.hiddenSections || []).includes('marketing') && (
        <AdvertisingSchedule
          schedule={proposal.advertisingSchedule || getDefaultProposalExtras().advertisingSchedule}
          totalCost={proposal.totalAdvertisingCost ?? DEFAULT_TOTAL_ADVERTISING_COST}
          methodOfSale={proposal.methodOfSale}
        />
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
