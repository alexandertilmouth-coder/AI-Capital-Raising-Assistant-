import React, { useState, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectOption } from '@/components/ui/select';
import { findClosedDeals, generateMarketAppetiteAnalysis } from '@/services/geminiService';
import { renderMarkdown } from '@/lib/markdown';
import { initialDeals, initialMarketAppetite } from '@/data/initialData';
import PieChart from '@/components/PieChart';
import type { ClosedDeal } from '@/types';

export default function ClosedFunds() {
  const [closedDeals, setClosedDeals] = useState<ClosedDeal[]>(initialDeals);
  const [isFindingDeals, setIsFindingDeals] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [marketAppetite, setMarketAppetite] = useState<string | null>(initialMarketAppetite);
  const [filters, setFilters] = useState({ assetClass: 'All', geography: 'All', strategy: 'All' });

  const handleFindDeals = useCallback(async () => {
    setIsFindingDeals(true);
    setDealsError(null);
    try {
      const newDeals = await findClosedDeals();
      const existingDealNames = new Set(closedDeals.map(deal => deal.dealName));
      const uniqueNewDeals = newDeals.filter(deal => !existingDealNames.has(deal.dealName));

      if (uniqueNewDeals.length > 0) {
        const combinedDeals = [...uniqueNewDeals, ...closedDeals];
        const cappedDeals = combinedDeals.slice(0, 40);
        setClosedDeals(cappedDeals);

        const analysis = await generateMarketAppetiteAnalysis(cappedDeals);
        setMarketAppetite(analysis);
      }
    } catch (err) {
      console.error('Error finding closed deals:', err);
      setDealsError('An error occurred while fetching recent deals. Please try again later.');
    } finally {
      setIsFindingDeals(false);
    }
  }, [closedDeals]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const normalizeGeography = useCallback((geo: string) => {
    if (geo.includes('&')) {
      return geo.split('&').map(s => s.trim()).sort().join(' & ');
    }
    return geo;
  }, []);

  const filterOptions = useMemo(() => {
    const geographies = ['All', ...Array.from(new Set(closedDeals.map(d => normalizeGeography(d.geographyFocus))))]
      .sort((a: string, b: string) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    const assetClasses = ['All', ...Array.from(new Set(closedDeals.map(d => d.assetClass)))].sort();

    const uniqueStrategies = [...new Set(closedDeals.map(d => d.strategy))].sort();
    const strategies = {
      bySize: [] as string[],
      bySector: [] as string[],
      other: [] as string[],
    };

    uniqueStrategies.forEach((s: string) => {
      const sLower = s.toLowerCase();
      if (sLower.includes('cap') || sLower.includes('buyout') || sLower.includes('venture') || sLower.includes('growth equity')) {
        strategies.bySize.push(s);
      } else if (
        sLower.includes('software') || sLower.includes('financial services') || sLower.includes('energy') ||
        sLower.includes('infrastructure') || sLower.includes('real estate') || sLower.includes('tech') ||
        sLower.includes('healthcare') || sLower.includes('consumer') || sLower.includes('services')
      ) {
        strategies.bySector.push(s);
      } else {
        strategies.other.push(s);
      }
    });

    return { assetClasses, geographies, strategies };
  }, [closedDeals, normalizeGeography]);

  const filteredDeals = useMemo(() => {
    return closedDeals.filter(deal => {
      const assetClassMatch = filters.assetClass === 'All' || deal.assetClass === filters.assetClass;
      const geographyMatch = filters.geography === 'All' || normalizeGeography(deal.geographyFocus) === filters.geography;
      const strategyMatch = filters.strategy === 'All' || deal.strategy === filters.strategy;
      return assetClassMatch && geographyMatch && strategyMatch;
    });
  }, [closedDeals, filters, normalizeGeography]);

  const pieChartData = useMemo(() => {
    if (closedDeals.length === 0) return [];
    const counts = closedDeals.reduce((acc, deal) => {
      acc[deal.assetClass] = (acc[deal.assetClass] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors: { [key: string]: string } = {
      'Private Equity': '#2563eb',
      'Private Credit': '#7c3aed',
      'Other': '#64748b',
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#94a3b8',
    }));
  }, [closedDeals]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column - Controls */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={handleFindDeals}
              disabled={isFindingDeals}
              className="w-full"
              size="lg"
            >
              {isFindingDeals ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching for Deals...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh Closed Deals
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Market Appetite */}
        {marketAppetite && (
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Market Appetite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <PieChart data={pieChartData} />
              </div>
              <div
                className="prose prose-sm prose-slate max-w-none text-slate-600 [&_h3]:text-slate-900 [&_h3]:text-sm [&_h3]:font-semibold [&_strong]:text-slate-900"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(marketAppetite) }}
              />
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Asset Class</label>
              <Select name="assetClass" value={filters.assetClass} onChange={handleFilterChange}>
                {filterOptions.assetClasses.map(opt => (
                  <SelectOption key={opt} value={opt}>{opt}</SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Geography</label>
              <Select name="geography" value={filters.geography} onChange={handleFilterChange}>
                {filterOptions.geographies.map(opt => (
                  <SelectOption key={opt} value={opt}>{opt}</SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Strategy</label>
              <Select name="strategy" value={filters.strategy} onChange={handleFilterChange}>
                <SelectOption value="All">All</SelectOption>
                {filterOptions.strategies.bySize.length > 0 && (
                  <optgroup label="By Size / Style">
                    {filterOptions.strategies.bySize.map(s => (
                      <SelectOption key={s} value={s}>{s}</SelectOption>
                    ))}
                  </optgroup>
                )}
                {filterOptions.strategies.bySector.length > 0 && (
                  <optgroup label="By Sector">
                    {filterOptions.strategies.bySector.map(s => (
                      <SelectOption key={s} value={s}>{s}</SelectOption>
                    ))}
                  </optgroup>
                )}
                {filterOptions.strategies.other.length > 0 && (
                  <optgroup label="Other">
                    {filterOptions.strategies.other.map(s => (
                      <SelectOption key={s} value={s}>{s}</SelectOption>
                    ))}
                  </optgroup>
                )}
              </Select>
            </div>
            <p className="text-xs text-slate-400">
              Showing {filteredDeals.length} of {closedDeals.length} deals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Deal Cards */}
      <div className="lg:col-span-8 space-y-4">
        {dealsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-600">{dealsError}</p>
          </div>
        )}

        {isFindingDeals && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-500">Searching for recently closed deals...</span>
          </div>
        )}

        {filteredDeals.length === 0 && !isFindingDeals && (
          <div className="flex items-center justify-center min-h-[200px] rounded-lg border-2 border-dashed border-slate-200 bg-white">
            <p className="text-slate-400 font-medium">No deals match the selected filters.</p>
          </div>
        )}

        {filteredDeals.map((deal, index) => (
          <Card key={`${deal.dealName}-${index}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{deal.dealName}</h3>
                  <p className="text-sm text-slate-500">{deal.placementAgent !== 'N/A' ? deal.placementAgent : 'Direct'} &middot; {deal.fundSize}</p>
                </div>
                {deal.sourceUrl && (
                  <a
                    href={deal.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="text-sm text-slate-600 mb-3">{deal.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{deal.assetClass}</Badge>
                <Badge variant="secondary">{deal.strategy}</Badge>
                <Badge variant="outline">{deal.geographyFocus}</Badge>
                {deal.sectorFocus !== 'Sector-Agnostic' && (
                  <Badge variant="outline">{deal.sectorFocus}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
