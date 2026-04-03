export interface AgencyOffice {
  name: string;
  address: string;
  phone: string;
}

export interface AgencyConfig {
  name: string;
  legalName?: string;
  abn?: string;
  directors?: string;
  logo?: string;
  primaryColor: string;
  accentColor: string;
  defaultCommissionRate: number;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  website?: string;
  agentName?: string;
  agentTitle?: string;
  agentPhone?: string;
  agentPhoto?: string;
  agentBio?: string;
  agentYearsExperience?: number;
  stats?: AgencyStat[];
  offices?: AgencyOffice[];
}

export interface AgencyStat {
  value: string;
  label: string;
}

export interface FeeInfo {
  commissionRate: number;
  fixedFees?: string[];
  inclusions?: string[];
  marketingBudget?: string;
}

export interface Proposal {
  id: string;
  clientName: string;
  clientEmail: string;
  propertyAddress: string;
  proposalDate: string;
  heroImage?: string;
  propertyImages?: string[];
  priceGuide?: { min: number; max: number };
  showPriceRange?: boolean;
  showCommission?: boolean;
  methodOfSale?: string;
  saleProcess: SaleStep[];
  marketingPlan: MarketingItem[];
  recentSales: PropertySale[];
  fees?: FeeInfo;
  agency?: AgencyConfig;
  advertisingSchedule?: AdvertisingWeek[];
  totalAdvertisingCost?: number;
  areaAnalysis?: AreaAnalysis;
  teamMembers?: AgentProfile[];
  marketingApproach?: string;  // why this marketing strategy
  databaseInfo?: string;  // VIP buyers / database explanation
  internetListings?: string[];  // specific platforms
  onMarketListings?: OnMarketListing[];
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
  imageUrl?: string;
}

export interface OnMarketListing {
  address: string;
  askingPrice: string;
  bedrooms: number;
  bathrooms: number;
  cars: number;
  propertyType: string;
  url: string;
  imageUrl?: string;
  daysOnMarket?: number;
}

export interface MarketingItem {
  channel: string;
  description: string;
  cost?: string;
  icon?: string;
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

export interface AdvertisingWeek {
  week: number;
  activities: AdvertisingActivity[];
}

export interface AdvertisingActivity {
  category: string;  // e.g. "Professional Photography", "Signboard", "Internet advertising", "Open Home", "Social Media", "Brochures", "Drone Photography", "Virtual Furniture"
  description: string;
  cost?: number;
  included?: boolean;  // true if included at no cost
}

export interface AreaAnalysis {
  suburb: string;
  medianPrice?: number;
  medianDaysOnMarket?: number;
  demandLevel?: string;  // "high", "moderate", "low"
  priceGrowth?: string;  // e.g. "+12.5% over 12 months"
  overview: string;  // paragraph about the area
  highlights?: string[];  // e.g. ["Close to schools", "Low stock levels"]
}

export interface AgentProfile {
  name: string;
  title: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  bio?: string;
  yearsExperience?: number;
}
