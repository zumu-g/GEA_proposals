import { notFound } from 'next/navigation'
import { getProposal } from '@/lib/proposal-generator'
import { ProposalLayout } from '@/components/Layout/ProposalLayout'
import { HeroSection } from '@/components/Proposal/HeroSection'
import { SaleProcess } from '@/components/Proposal/SaleProcess'
import { MarketingPlan } from '@/components/Proposal/MarketingPlan'
import { RecentSales } from '@/components/Proposal/RecentSales'
import { ApprovalButton } from '@/components/Proposal/ApprovalButton'
import { Proposal } from '@/types/proposal'

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
    title: `Property Proposal - ${proposal.clientName}`,
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
      <div className="min-h-screen">
        <HeroSection proposal={proposal} />
        <SaleProcess steps={proposal.saleProcess} />
        <MarketingPlan items={proposal.marketingPlan} />
        {proposal.recentSales.length > 0 && (
          <RecentSales sales={proposal.recentSales} />
        )}

        {/* Spacer for mobile fixed button */}
        <div className="h-24 sm:h-0"></div>

        <ApprovalButton proposal={proposal} />
      </div>
    </ProposalLayout>
  )
}
