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
    description: `Property ${proposal.proposalType === 'rental' ? 'rental' : 'sale'} proposal for ${proposal.propertyAddress}`,
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

        {/* Method of sale explainer — sale proposals only */}
        {proposal.proposalType !== 'rental' && <MethodExplainer method={proposal.methodOfSale} />}

        {/* Area analysis - local market conditions */}
        <AreaAnalysis analysis={proposal.areaAnalysis} />

        {/* Recent comparable sales / rentals */}
        <RecentSales sales={proposal.recentSales} proposalType={proposal.proposalType} />

        {/* On-market comparable listings */}
        <OnMarketListings listings={proposal.onMarketListings || []} />

        {/* VIP buyers, database, internet access */}
        <VIPBuyers />

        {/* Internet presence - listing platforms */}
        <InternetPresence listings={proposal.internetListings} />

        {/* Our team across offices */}
        <TeamShowcase agency={proposal.agency} />

        {/* Visual process journey */}
        <ProcessJourney steps={proposal.saleProcess} methodOfSale={proposal.methodOfSale} proposalType={proposal.proposalType} />

        {/* Marketing showcase - channels */}
        <MarketingShowcase items={proposal.marketingPlan} />

        {/* Advertising schedule - 4-week campaign with costs */}
        <AdvertisingSchedule
          schedule={proposal.advertisingSchedule || getDefaultProposalExtras().advertisingSchedule}
          totalCost={proposal.totalAdvertisingCost ?? DEFAULT_TOTAL_ADVERTISING_COST}
          methodOfSale={proposal.methodOfSale}
          campaignLabel={proposal.dualCampaign ? 'residential campaign' : undefined}
        />

        {/* ─── Development site campaign (dual target) ─── */}
        {proposal.dualCampaign && (
          <>
            {/* Section break — campaign heading */}
            <section className="py-16 sm:py-20 bg-charcoal-900 text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand" />
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
                <p className="font-sans text-xs font-medium tracking-wider-custom uppercase text-gold/80 mb-4">
                  dual target campaign
                </p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal lowercase mb-4">
                  development site campaign
                </h2>
                <p className="text-white/70 font-sans text-base sm:text-lg font-light max-w-2xl leading-relaxed">
                  alongside the residential campaign, your property is presented to the development
                  market — run simultaneously, with its own marketing and advertised on realcommercial.com.au
                </p>
                {proposal.devPriceGuide && proposal.devShowPriceRange !== false && (
                  <p className="mt-6 font-display text-2xl text-white">
                    developer guide: ${proposal.devPriceGuide.min.toLocaleString()} — ${proposal.devPriceGuide.max.toLocaleString()}
                  </p>
                )}
              </div>
            </section>

            {/* Dev method of sale — strict: never falls back to residential auction copy */}
            <MethodExplainer method={proposal.devMethodOfSale} strict />

            {/* Dev internet presence — realcommercial-led */}
            <InternetPresence listings={[
              'realcommercial.com.au (Premium listing)',
              'developmentready.com.au',
              'realestate.com.au',
              'grantsea.com.au',
            ]} />

            {/* Dev marketing channels */}
            {proposal.devMarketingPlan && proposal.devMarketingPlan.length > 0 && (
              <MarketingShowcase items={proposal.devMarketingPlan} campaignLabel="development site campaign" />
            )}

            {/* Dev advertising schedule */}
            <AdvertisingSchedule
              schedule={proposal.devAdvertisingSchedule}
              totalCost={proposal.devTotalAdvertisingCost}
              methodOfSale={proposal.devMethodOfSale}
              campaignLabel="development site campaign"
            />

            {/* Combined advertising investment */}
            <section className="py-12 sm:py-16 bg-white border-t border-gray-100">
              <div className="max-w-3xl mx-auto px-6 sm:px-8">
                <div className="space-y-2 font-sans text-base text-charcoal-400">
                  <div className="flex items-center justify-between">
                    <span>residential campaign</span>
                    <span className="tabular-nums">${(proposal.totalAdvertisingCost ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>development site campaign</span>
                    <span className="tabular-nums">${(proposal.devTotalAdvertisingCost ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-display text-xl text-charcoal lowercase">combined advertising investment</span>
                  <span className="font-display text-2xl text-brand tabular-nums">
                    ${((proposal.totalAdvertisingCost ?? 0) + (proposal.devTotalAdvertisingCost ?? 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Fee structure */}
        <FeeStructureVisual fees={proposal.fees} showCommission={proposal.showCommission !== false} methodOfSale={proposal.methodOfSale} proposalType={proposal.proposalType} managementFee={proposal.managementFee} lettingFee={proposal.lettingFee} />

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
