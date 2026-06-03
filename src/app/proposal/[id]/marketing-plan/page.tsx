import { notFound } from 'next/navigation'
import { getProposal, getAgencyConfig } from '@/lib/proposal-generator'
import { resolvePlanItems } from '@/lib/marketing-plan'
import { MarketingPlanSheet } from '@/components/Marketing/MarketingPlanSheet'
import { MarketingPlanPage } from '@/components/Marketing/MarketingPlanPage'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProposalMarketingPlanPage({ params }: PageProps) {
  const { id } = await params
  const proposal = await getProposal(id)
  if (!proposal) notFound()

  const items = resolvePlanItems(proposal.marketingCosts, proposal.advertisingSchedule)
  const agency = await getAgencyConfig()

  return (
    <MarketingPlanPage>
      <MarketingPlanSheet
        items={items}
        propertyAddress={proposal.propertyAddress}
        priceGuide={proposal.priceGuide}
        agencyName={agency.name}
        agentName={agency.agentName}
        agentPhone={agency.agentPhone}
        agentEmail={agency.contactEmail}
      />
    </MarketingPlanPage>
  )
}
