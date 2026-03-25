import { notFound } from 'next/navigation'
import { getProposal, getDefaultProposalExtras, DEFAULT_TOTAL_ADVERTISING_COST } from '@/lib/proposal-generator'
import { ProposalLayout } from '@/components/Layout/ProposalLayout'
import { FullHero } from '@/components/Proposal/FullHero'
import { BrandStatement } from '@/components/Proposal/BrandStatement'
import { AgentProfile } from '@/components/Proposal/AgentProfile'
import { StatsBar } from '@/components/Proposal/StatsBar'
import { AreaAnalysis } from '@/components/Proposal/AreaAnalysis'
import { MarketingStrategy } from '@/components/Proposal/MarketingStrategy'
import { MethodExplainer } from '@/components/Proposal/MethodExplainer'
import { VIPBuyers } from '@/components/Proposal/VIPBuyers'
import { InternetPresence } from '@/components/Proposal/InternetPresence'
import { TeamShowcase } from '@/components/Proposal/TeamShowcase'
import { ProcessJourney } from '@/components/Proposal/ProcessJourney'
import { MarketingShowcase } from '@/components/Proposal/MarketingShowcase'
import { AdvertisingSchedule } from '@/components/Proposal/AdvertisingSchedule'
// PropertyGallery removed — hero image is sufficient, auto-scraped gallery images were unreliable
import { RecentSales } from '@/components/Proposal/RecentSales'
import { OnMarketListings } from '@/components/Proposal/OnMarketListings'
import { FeeStructureVisual } from '@/components/Proposal/FeeStructureVisual'
import { ClosingStatement } from '@/components/Proposal/ClosingStatement'
import { ApprovalSection } from '@/components/Proposal/ApprovalSection'
import { Footer } from '@/components/Proposal/Footer'
import { PdfButton } from '@/components/Proposal/PdfButton'
import { ViewTracker } from '@/components/Proposal/ViewTracker'

interface ProposalPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ProposalPageProps) {
  const { id } = await params
  const proposal = await getProposal(id)

  if (!proposal) {
    return {
      title: 'Proposal Not Found',
    }
  }

  return {
    title: `${proposal.propertyAddress} — Grant's Proposal`,
    description: `Property sale proposal for ${proposal.propertyAddress}`,
  }
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { id } = await params
  const proposal = await getProposal(id)

  if (!proposal) {
    notFound()
  }

  return (
    <ProposalLayout>
      <ViewTracker proposalId={proposal.id} />
      <PdfButton />

      <div className="min-h-screen">
        {/* Full-viewport cinematic hero */}
        <FullHero proposal={proposal} />

        {/* Brand statement - price guide, method of sale */}
        <BrandStatement proposal={proposal} />

        {/* Agent profile - intro + buyer database info */}
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

        {/* Stats bar - agency metrics */}
        <StatsBar stats={proposal.agency?.stats} />

        {/* Marketing strategy narrative */}
        <MarketingStrategy
          approach={proposal.marketingApproach}
          propertyAddress={proposal.propertyAddress}
        />

        {/* Method of sale explainer */}
        <MethodExplainer method={proposal.methodOfSale} />

        {/* Area analysis - local market conditions */}
        <AreaAnalysis analysis={proposal.areaAnalysis} />

        {/* Recent comparable sales */}
        <RecentSales sales={proposal.recentSales} />

        {/* On-market comparable listings */}
        <OnMarketListings listings={proposal.onMarketListings || []} />

        {/* VIP buyers, database, internet access */}
        <VIPBuyers />

        {/* Internet presence - listing platforms */}
        <InternetPresence listings={proposal.internetListings} />

        {/* Our team across offices */}
        <TeamShowcase agency={proposal.agency} />

        {/* Visual process journey */}
        <ProcessJourney steps={proposal.saleProcess} />

        {/* Marketing showcase - channels */}
        <MarketingShowcase items={proposal.marketingPlan} />

        {/* Advertising schedule - 4-week campaign with costs */}
        <AdvertisingSchedule
          schedule={proposal.advertisingSchedule || getDefaultProposalExtras().advertisingSchedule}
          totalCost={proposal.totalAdvertisingCost ?? DEFAULT_TOTAL_ADVERTISING_COST}
        />

        {/* Fee structure */}
        <FeeStructureVisual fees={proposal.fees} />

        {/* Personal closing statement */}
        <ClosingStatement
          agentName={proposal.agency?.agentName}
          agentTitle={proposal.agency?.agentTitle}
          agentPhoto={proposal.agency?.agentPhoto}
        />

        {/* Approval CTA */}
        <ApprovalSection proposal={proposal} />

        {/* Footer */}
        <Footer agency={proposal.agency} />
      </div>
    </ProposalLayout>
  )
}
