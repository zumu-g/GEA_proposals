export interface AgencyConfig {
  name: string;
  logo?: string;
  primaryColor: string;
  accentColor: string;
  defaultCommissionRate: number;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  website?: string;
}

export interface FeeInfo {
  commissionRate: number;
  fixedFees?: string[];
  inclusions?: string[];
}

export interface Proposal {
  id: string;
  clientName: string;
  clientEmail: string;
  propertyAddress: string;
  proposalDate: string;
  heroImage?: string;
  propertyImages?: string[];
  saleProcess: SaleStep[];
  marketingPlan: MarketingItem[];
  recentSales: PropertySale[];
  fees?: FeeInfo;
  agency?: AgencyConfig;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';
  sentAt?: string;
  viewedAt?: string;
  approvedAt?: string;
}

export interface SaleStep {
  step: number;
  title: string;
  description: string;
  duration?: string;
}

export interface MarketingItem {
  channel: string;
  description: string;
  cost?: string;
}

export interface PropertySale {
  address: string;
  price: number;
  date: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  distance: number;
  url: string;
  imageUrl?: string;
}
