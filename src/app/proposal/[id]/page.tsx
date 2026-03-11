import { notFound } from 'next/navigation'
import { getProposal } from '@/lib/proposal-generator'
import { ProposalLayout } from '@/components/Layout/ProposalLayout'
import { FullHero } from '@/components/Proposal/FullHero'
import { BrandStatement } from '@/components/Proposal/BrandStatement'
import { StatsBar } from '@/components/Proposal/StatsBar'
import { ProcessJourney } from '@/components/Proposal/ProcessJourney'
import { MarketingShowcase } from '@/components/Proposal/MarketingShowcase'
import { PropertyGallery } from '@/components/Proposal/PropertyGallery'
import { RecentSales } from '@/components/Proposal/RecentSales'
import { FeeStructureVisual } from '@/components/Proposal/FeeStructureVisual'
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

        {/* Brand statement - personalised to property */}
        <BrandStatement proposal={proposal} />

        {/* Stats bar - key numbers */}
        <StatsBar stats={proposal.agency?.stats} />

        {/* Recent comparable sales — moved up, this is what vendors care about most */}
        {proposal.recentSales?.length > 0 && (
          <RecentSales sales={proposal.recentSales} />
        )}

        {/* Visual process journey */}
        <ProcessJourney steps={proposal.saleProcess} />

        {/* Marketing showcase */}
        <MarketingShowcase items={proposal.marketingPlan} />

        {/* Property gallery - if images provided */}
        {proposal.propertyImages && proposal.propertyImages.length > 0 && (
          <PropertyGallery
            images={proposal.propertyImages}
            address={proposal.propertyAddress}
          />
        )}

        {/* Fee structure */}
        <FeeStructureVisual fees={proposal.fees} />

        {/* Approval CTA */}
        <ApprovalSection proposal={proposal} />

        {/* Footer */}
        <Footer agency={proposal.agency} />
      </div>
    </ProposalLayout>
  )
}
