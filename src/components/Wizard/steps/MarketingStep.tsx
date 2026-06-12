'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MarketingCostItem {
  id?: string;
  category: string;
  description: string;
  cost: number;
  included: boolean;
}

interface MarketingStepProps {
  marketingCosts: MarketingCostItem[];
  onChange: (costs: MarketingCostItem[]) => void;
  // Optional context used to populate the single-page marketing-plan preview header.
  propertyAddress?: string;
  priceGuideMin?: string;
  priceGuideMax?: string;
  // Dual target campaign — second item list for the development site campaign
  dualCampaign?: boolean;
  devMarketingCosts?: MarketingCostItem[];
  onChangeDev?: (costs: MarketingCostItem[]) => void;
}

// sessionStorage key shared with /marketing-plan/preview
const MARKETING_PREVIEW_KEY = 'gea:marketing-plan-preview';

// ── Validation ─────────────────────────────────────────────────────────────

export function validateMarketing(costs: MarketingCostItem[]): string | null {
  if (costs.length === 0) {
    return 'At least one marketing item is required';
  }
  for (let i = 0; i < costs.length; i++) {
    const item = costs[i];
    if (!item.description.trim()) {
      return `Item ${i + 1} needs a description`;
    }
    if (!item.included && (!item.cost || item.cost <= 0)) {
      return `Item ${i + 1} needs a cost (or mark as included)`;
    }
  }
  return null;
}

// ── Stable ID helper ──────────────────────────────────────────────────────

let nextItemId = 0;
function generateItemId(): string {
  return `mkt-${Date.now()}-${nextItemId++}`;
}

function ensureItemId(item: MarketingCostItem): MarketingCostItem {
  if (item.id) return item;
  return { ...item, id: generateItemId() };
}

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Photography',
  'Copywriting',
  'Internet',
  'Print',
  'Signboard',
  'Styling',
  'Auctioneer',
  'Other',
] as const;

// Figures from Grant's REA rate card (effective 1 July 2025). REA premiere
// listing shown at the Berwick rate ($2760) — adjust per suburb if needed.
const STANDARD_PACKAGE: MarketingCostItem[] = [
  { category: 'Photography', description: 'Complete Image — Sales Day Shoot (20 images) & 2D floor plan + site plan', cost: 370, included: false },
  { category: 'Internet', description: 'Premiere Listing — realestate.com.au (4 week premiere — Berwick)', cost: 2760, included: false },
  { category: 'Signboard', description: 'Central signboard — 4 x 8 stock board', cost: 100, included: false },
  { category: 'Print', description: 'Premium property brochures for open homes', cost: 150, included: false },
];

const PREMIUM_PACKAGE: MarketingCostItem[] = [
  { category: 'Photography', description: 'Complete Image — Sales Twilight, 2D floor plan, site plan & drone', cost: 685, included: false },
  { category: 'Internet', description: 'Premiere Listing — realestate.com.au (4 week premiere — Berwick)', cost: 2760, included: false },
  { category: 'Internet', description: 'Domain & social media campaign (Facebook + Instagram)', cost: 0, included: true },
  { category: 'Signboard', description: 'Central photo board — 4 x 8 (Auction)', cost: 380, included: false },
  { category: 'Print', description: 'A4 brochures x 200 + DL flyers x 500', cost: 450, included: false },
  { category: 'Auctioneer', description: 'Aleisha — professional auctioneer', cost: 700, included: false },
];

// Development site campaign preset — realcommercial.com.au-led, costs editable.
// Listing tier pricing is a best-guess default; confirm with the agency.
const DEVELOPMENT_PACKAGE: MarketingCostItem[] = [
  { category: 'Internet', description: 'Premium Listing — realcommercial.com.au (development site campaign)', cost: 1800, included: false },
  { category: 'Signboard', description: 'Development site signboard — 6 x 4 with site dimensions', cost: 450, included: false },
  { category: 'Photography', description: 'Drone / aerial photography with site boundary overlay', cost: 550, included: false },
  { category: 'Other', description: 'Expressions of Interest campaign administration', cost: 0, included: true },
  { category: 'Internet', description: 'Targeted developer eDM — agency developer database', cost: 0, included: true },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Photography: { bg: 'bg-blue-50', text: 'text-blue-700' },
  Copywriting: { bg: 'bg-purple-50', text: 'text-purple-700' },
  Internet: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  Print: { bg: 'bg-amber-50', text: 'text-amber-700' },
  Signboard: { bg: 'bg-orange-50', text: 'text-orange-700' },
  Styling: { bg: 'bg-pink-50', text: 'text-pink-700' },
  Auctioneer: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  Other: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

// ── Animated Counter ───────────────────────────────────────────────────────

function AnimatedTotal({ value }: { value: number }) {
  const isFirstRender = useRef(true);
  const motionVal = useMotionValue(value);
  const displayed = useTransform(motionVal, (v) => `$${Math.round(v).toLocaleString()}`);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Skip animation on first render — show the value immediately
    if (isFirstRender.current) {
      isFirstRender.current = false;
      motionVal.set(value);
      return;
    }
    const controls = animate(motionVal, value, {
      duration: 0.5,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, motionVal]);

  useEffect(() => {
    const unsubscribe = displayed.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [displayed]);

  return (
    <span ref={ref} className="text-[#C41E2A] font-sans text-2xl font-bold tabular-nums">
      ${value.toLocaleString()}
    </span>
  );
}

// ── Development site campaign editor ───────────────────────────────────────
// Self-contained second item list shown when the dual campaign toggle is on.
// Deliberately separate from the residential editor so the existing flow is
// untouched for non-dual proposals.

function DevCampaignEditor({
  items,
  onChange,
}: {
  items: MarketingCostItem[];
  onChange: (costs: MarketingCostItem[]) => void;
}) {
  const total = items.filter((i) => !i.included).reduce((s, i) => s + (i.cost || 0), 0);
  const isEmpty = items.length === 0;

  const update = (index: number, field: keyof MarketingCostItem, value: string | number | boolean) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4 pt-8 mt-8 border-t border-gray-200">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3
            className="text-xl font-light tracking-tight text-gray-900 lowercase"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            development site campaign
          </h3>
          <p className="mt-1 text-gray-500 font-sans text-xs">
            targeting developers — advertised on realcommercial.com.au
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEVELOPMENT_PACKAGE.map((item) => ({ ...item, id: generateItemId() })))}
          className="px-3 py-2 rounded-lg border border-[#C41E2A]/30 bg-[#C41E2A]/[0.04] hover:bg-[#C41E2A]/[0.08] text-[#C41E2A] font-sans text-xs font-medium transition-colors"
        >
          apply development preset
        </button>
      </div>

      {isEmpty && (
        <p className="text-[#C41E2A] font-sans text-xs">
          add at least one development campaign item
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => {
          const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
          return (
            <div
              key={item.id || `dev-${index}`}
              className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${
                item.included ? 'bg-green-50 border-[#8B9F82]/30' : 'bg-white border-gray-200'
              }`}
            >
              <select
                value={item.category}
                onChange={(e) => update(index, 'category', e.target.value)}
                className={`px-2 py-2 rounded-lg font-sans text-sm border-0 outline-none ${catColor.bg} ${catColor.text} sm:w-36`}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                value={item.description}
                onChange={(e) => update(index, 'description', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-1 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 outline-none"
                placeholder="Description"
              />
              {item.included ? (
                <div className="px-3 py-2 bg-[#8B9F82]/10 border border-[#8B9F82]/20 rounded-lg text-[#8B9F82] font-sans text-sm text-center sm:w-28">
                  included
                </div>
              ) : (
                <div className="relative sm:w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-sm pointer-events-none">$</span>
                  <input
                    type="number"
                    value={item.cost || ''}
                    onChange={(e) => update(index, 'cost', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="10"
                    className="w-full pl-7 pr-2 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm outline-none focus:ring-1 focus:ring-[#C41E2A]/50"
                    placeholder="0"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 sm:gap-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={(e) => update(index, 'included', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-[18px] bg-gray-300 rounded-full peer-checked:bg-[#8B9F82] transition-colors duration-200" />
                    <div className="absolute top-0.5 left-0.5 w-[14px] h-[14px] bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-3.5" />
                  </div>
                  <span className="text-gray-500 font-sans text-xs whitespace-nowrap">incl</span>
                </label>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                  aria-label="Remove item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange([...items, { id: generateItemId(), category: 'Other', description: '', cost: 0, included: false }])}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#C41E2A]/40 bg-white hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 font-sans text-sm"
      >
        + add development item
      </button>

      {!isEmpty && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <span className="text-gray-700 font-sans text-sm font-medium">development campaign total</span>
          <span className="text-[#C41E2A] font-sans text-lg font-bold tabular-nums">${total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function MarketingStep({ marketingCosts, onChange, propertyAddress, priceGuideMin, priceGuideMax, dualCampaign, devMarketingCosts, onChangeDev }: MarketingStepProps) {
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null);
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Ensure all items have stable IDs (assign once, on first render or when items lack IDs)
  useEffect(() => {
    const needsIds = marketingCosts.some((item) => !item.id);
    if (needsIds) {
      onChange(marketingCosts.map(ensureItemId));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCost = marketingCosts
    .filter((item) => !item.included)
    .reduce((sum, item) => sum + (item.cost || 0), 0);

  const includedValue = marketingCosts
    .filter((item) => item.included)
    .reduce((sum, item) => sum + (item.cost || 0), 0);

  const grandTotal = totalCost + includedValue;

  // ── Handlers ───────────────────────────────────────────────────────────

  const updateItem = useCallback(
    (index: number, field: keyof MarketingCostItem, value: string | number | boolean) => {
      const updated = [...marketingCosts];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [marketingCosts, onChange]
  );

  const removeItem = useCallback(
    (index: number) => {
      const updated = marketingCosts.filter((_, i) => i !== index);
      onChange(updated);
    },
    [marketingCosts, onChange]
  );

  const addItem = useCallback(() => {
    onChange([
      ...marketingCosts,
      { id: generateItemId(), category: 'Other', description: '', cost: 0, included: false },
    ]);
  }, [marketingCosts, onChange]);

  const moveItem = useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= marketingCosts.length) return;
      const updated = [...marketingCosts];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      onChange(updated);
    },
    [marketingCosts, onChange]
  );

  const applyTemplate = useCallback(
    (template: MarketingCostItem[]) => {
      onChange(template.map((item) => ({ ...item, id: generateItemId() })));
    },
    [onChange]
  );

  const openMarketingPlanPreview = useCallback(() => {
    const min = priceGuideMin ? parseFloat(priceGuideMin) : undefined;
    const max = priceGuideMax ? parseFloat(priceGuideMax) : undefined;
    const payload = {
      items: marketingCosts,
      propertyAddress: propertyAddress || undefined,
      priceGuide: min || max ? { min, max } : undefined,
    };
    try {
      // localStorage (not sessionStorage) so the value is visible to the new tab.
      localStorage.setItem(MARKETING_PREVIEW_KEY, JSON.stringify(payload));
      const win = window.open('/marketing-plan/preview', '_blank');
      // Popup blocked — fall back to same-tab navigation.
      if (!win) window.location.href = '/marketing-plan/preview';
    } catch {
      // storage unavailable — ignore
    }
  }, [marketingCosts, propertyAddress, priceGuideMin, priceGuideMax]);

  const isEmpty = marketingCosts.length === 0;

  // ── Motion config ──────────────────────────────────────────────────────

  const rowVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -20, height: 0, marginBottom: 0 },
  };

  return (
    <div className="space-y-8">
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div>
        <h2
          className="text-3xl font-light tracking-tight text-gray-900 lowercase"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          marketing &amp; advertising
        </h2>
        <p className="mt-2 text-gray-500 font-sans text-sm">
          Build the vendor&apos;s advertising schedule and costs
        </p>
      </div>

      {/* ── Quick Templates (only when empty) ──────────────────────────── */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* Standard */}
            <button
              type="button"
              onClick={() => applyTemplate(STANDARD_PACKAGE)}
              className="group relative p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#C41E2A]/40 bg-white hover:bg-gray-50 transition-all duration-200 text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#C41E2A]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#C41E2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-sans text-sm font-medium">standard package</p>
                  <p className="text-gray-400 font-sans text-xs">4 items &middot; ~$3,380</p>
                </div>
              </div>
              <p className="text-gray-500 font-sans text-xs leading-relaxed">
                Photography, internet listing, signboard &amp; print flyers
              </p>
            </button>

            {/* Premium */}
            <button
              type="button"
              onClick={() => applyTemplate(PREMIUM_PACKAGE)}
              className="group relative p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#C41E2A]/40 bg-white hover:bg-gray-50 transition-all duration-200 text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#C41E2A]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#C41E2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-sans text-sm font-medium">premium package</p>
                  <p className="text-gray-400 font-sans text-xs">6 items &middot; ~$4,975</p>
                </div>
              </div>
              <p className="text-gray-500 font-sans text-xs leading-relaxed">
                Full campaign with drone, staging, premiere listing, auctioneer &amp; more
              </p>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop Table Header (hidden on mobile) ────────────────────── */}
      {!isEmpty && (
        <div className="hidden sm:grid grid-cols-12 gap-2 px-1 pb-1">
          <div className="col-span-3">
            <span className="text-gray-500 font-sans text-[11px] uppercase tracking-wider">Category</span>
          </div>
          <div className="col-span-4">
            <span className="text-gray-500 font-sans text-[11px] uppercase tracking-wider">Description</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 font-sans text-[11px] uppercase tracking-wider">Cost</span>
          </div>
          <div className="col-span-3">
            <span className="text-gray-500 font-sans text-[11px] uppercase tracking-wider">Included / Actions</span>
          </div>
        </div>
      )}

      {/* ── Item Rows ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {marketingCosts.map((item, index) => {
            const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

            return (
              <motion.div
                key={item.id || `fallback-${index}`}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                  delay: prefersReducedMotion ? 0 : index * 0.05,
                }}
                layout={!prefersReducedMotion}
                className={`
                  rounded-xl border transition-colors duration-200
                  ${item.included
                    ? 'bg-green-50 border-[#8B9F82]/30'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-12 gap-2 items-center p-3">
                  {/* Category dropdown */}
                  <div className="col-span-3 relative">
                    <button
                      type="button"
                      onClick={() => setOpenCategoryIndex(openCategoryIndex === index ? null : index)}
                      className={`
                        w-full px-3 py-2 rounded-lg text-left font-sans text-sm
                        flex items-center justify-between gap-2
                        ${catColor.bg} ${catColor.text}
                        hover:opacity-80 transition-opacity
                      `}
                    >
                      <span className="truncate">{item.category}</span>
                      <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {/* Dropdown */}
                    <AnimatePresence>
                      {openCategoryIndex === index && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenCategoryIndex(null)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-20 top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden"
                          >
                            {CATEGORIES.map((cat) => {
                              const cc = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    updateItem(index, 'category', cat);
                                    setOpenCategoryIndex(null);
                                  }}
                                  className={`
                                    w-full px-3 py-2 text-left font-sans text-sm
                                    hover:bg-gray-100 transition-colors
                                    ${item.category === cat ? `${cc.text} bg-gray-50` : 'text-gray-700'}
                                  `}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Description */}
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-1 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all duration-200 outline-none"
                      placeholder="Description"
                    />
                  </div>

                  {/* Cost */}
                  <div className="col-span-2">
                    {item.included ? (
                      <div className="px-3 py-2 bg-[#8B9F82]/10 border border-[#8B9F82]/20 rounded-lg text-[#8B9F82] font-sans text-sm text-center">
                        $0 (included)
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-sm pointer-events-none">$</span>
                        <input
                          type="number"
                          value={item.cost || ''}
                          onChange={(e) => updateItem(index, 'cost', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="10"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-1 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all duration-200 outline-none"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center gap-2">
                    {/* Included toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer group flex-1">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={(e) => updateItem(index, 'included', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-[18px] bg-gray-300 rounded-full peer-checked:bg-[#8B9F82] transition-colors duration-200" />
                        <div className="absolute top-0.5 left-0.5 w-[14px] h-[14px] bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-3.5" />
                      </div>
                      <span className="text-gray-500 font-sans text-xs group-hover:text-gray-700 transition-colors whitespace-nowrap">
                        incl
                      </span>
                    </label>

                    {/* Move up / down */}
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100"
                      aria-label="Move up"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === marketingCosts.length - 1}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100"
                      aria-label="Move down"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                      aria-label="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Mobile layout — stacked card */}
                <div className="sm:hidden p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Category badge */}
                    <button
                      type="button"
                      onClick={() => setOpenCategoryIndex(openCategoryIndex === index ? null : index)}
                      className={`
                        px-3 py-1.5 rounded-lg font-sans text-xs font-medium
                        flex items-center gap-1.5
                        ${catColor.bg} ${catColor.text}
                      `}
                    >
                      <span>{item.category}</span>
                      <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {/* Mobile category dropdown */}
                    <AnimatePresence>
                      {openCategoryIndex === index && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenCategoryIndex(null)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-20 left-4 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden"
                            style={{ top: '2.5rem' }}
                          >
                            {CATEGORIES.map((cat) => {
                              const cc = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    updateItem(index, 'category', cat);
                                    setOpenCategoryIndex(null);
                                  }}
                                  className={`
                                    w-full px-4 py-2.5 text-left font-sans text-sm
                                    hover:bg-gray-100 transition-colors
                                    ${item.category === cat ? `${cc.text} bg-gray-50` : 'text-gray-700'}
                                  `}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Mobile actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors"
                        aria-label="Move up"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, 1)}
                        disabled={index === marketingCosts.length - 1}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors"
                        aria-label="Move down"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-1 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all duration-200 outline-none"
                    placeholder="Description"
                  />

                  {/* Cost + Included row */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      {item.included ? (
                        <div className="px-3 py-2.5 bg-[#8B9F82]/10 border border-[#8B9F82]/20 rounded-lg text-[#8B9F82] font-sans text-sm text-center">
                          $0 (included)
                        </div>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans text-sm pointer-events-none">$</span>
                          <input
                            type="number"
                            value={item.cost || ''}
                            onChange={(e) => updateItem(index, 'cost', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="10"
                            className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-sans text-sm placeholder-gray-400 focus:ring-1 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/50 transition-all duration-200 outline-none"
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={(e) => updateItem(index, 'included', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-[#8B9F82] transition-colors duration-200" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
                      </div>
                      <span className="text-gray-500 font-sans text-xs group-hover:text-gray-700 transition-colors">
                        included
                      </span>
                    </label>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ── Add Item Button ──────────────────────────────────────────── */}
        <motion.button
          type="button"
          onClick={addItem}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#C41E2A]/40 bg-white hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 font-sans text-sm group"
        >
          <svg className="w-4 h-4 group-hover:text-[#C41E2A] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          add item
        </motion.button>
      </div>

      {/* ── Running Totals ─────────────────────────────────────────────── */}
      {!isEmpty && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          className="rounded-xl border border-gray-200 bg-gray-50 p-5"
        >
          <div className="space-y-3">
            {/* Vendor cost */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-sans text-sm">vendor cost</span>
              <span className="text-gray-900 font-sans text-sm tabular-nums">
                ${totalCost.toLocaleString()}
              </span>
            </div>

            {/* Included value */}
            {includedValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B9F82]/70 font-sans text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  included by agency
                </span>
                <span className="text-[#8B9F82] font-sans text-sm tabular-nums">
                  ${includedValue.toLocaleString()}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Grand total */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-sans text-sm font-medium">total campaign value</span>
              <AnimatedTotal value={grandTotal} />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Development site campaign (dual target) ───────────────────── */}
      {dualCampaign && onChangeDev && (
        <DevCampaignEditor items={devMarketingCosts || []} onChange={onChangeDev} />
      )}

      {/* ── Marketing plan preview / print ─────────────────────────────── */}
      {/* Hidden for dual proposals — the preview page renders the residential campaign only */}
      {!isEmpty && !dualCampaign && (
        <button
          type="button"
          onClick={openMarketingPlanPreview}
          className="w-full py-3 rounded-xl border border-[#C41E2A]/30 bg-[#C41E2A]/[0.04] hover:bg-[#C41E2A]/[0.08] transition-colors duration-200 flex items-center justify-center gap-2 text-[#C41E2A] font-sans text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          preview / print marketing plan
        </button>
      )}
    </div>
  );
}