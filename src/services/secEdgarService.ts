import type { ClosedDeal } from '@/types';

const EFTS_BASE = 'https://efts.sec.gov/LATEST/search-index';
const SEC_PROXY_BASE = '/api/sec-archives';
const CACHE_KEY = 'edgar_closed_deals';
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface EdgarHit {
  _source: {
    ciks: string[];
    display_names: string[];
    file_date: string;
    form: string;
    adsh: string;
    biz_locations: string[];
    biz_states: string[];
    items: string[];
  };
}

interface CachedData {
  deals: ClosedDeal[];
  timestamp: number;
}

function getCachedDeals(): ClosedDeal[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { deals, timestamp }: CachedData = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return deals;
  } catch {
    return null;
  }
}

function cacheDeals(deals: ClosedDeal[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ deals, timestamp: Date.now() }));
  } catch { /* localStorage may be full */ }
}

function cleanDisplayName(raw: string): string {
  return raw.replace(/\s{2,}\(CIK\s+\d+\)/, '').trim();
}

function stripEntitySuffix(name: string): string {
  return name
    .replace(/,?\s*(L\.?P\.?|LLC|SCSp|Ltd\.?|Inc\.?|GP|S\.?C\.?S\.?)\s*$/i, '')
    .trim();
}

function getBaseFundName(name: string): string {
  return stripEntitySuffix(name)
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*-\s*[A-E]\s*$/i, '')
    .replace(/\s+(Parallel|Feeder|Offshore|Onshore|Master|Co-Invest(ment)?|Note Issuer|Holdings)\b.*$/i, '')
    .replace(/\s+Series\s+[A-Z]$/i, '')
    .replace(/\s+(No\.\s*\d+)$/i, '')
    .trim();
}

function inferAssetClass(name: string, items: string[]): 'Private Equity' | 'Private Credit' | 'Other' {
  const lower = name.toLowerCase();
  if (lower.includes('credit') || lower.includes('lending') || lower.includes('debt') ||
      lower.includes('mezzanine') || lower.includes('loan') || lower.includes('income')) {
    return 'Private Credit';
  }
  if (lower.includes('infrastructure') || lower.includes('real estate') ||
      lower.includes('property') || lower.includes('reit')) {
    return 'Other';
  }
  return 'Private Equity';
}

function inferStrategy(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('venture capital') || lower.includes(' vc ') || lower.includes('ventures')) return 'Venture Capital';
  if (lower.includes('growth')) return 'Growth Equity';
  if (lower.includes('buyout')) return 'Buyout';
  if (lower.includes('infrastructure')) return 'Infrastructure';
  if (lower.includes('real estate') || lower.includes('property')) return 'Real Estate';
  if (lower.includes('credit') || lower.includes('lending')) return 'Direct Lending';
  if (lower.includes('mezzanine')) return 'Mezzanine';
  if (lower.includes('secondary') || lower.includes('secondaries')) return 'Secondaries';
  if (lower.includes('distressed') || lower.includes('special situation')) return 'Distressed / Special Situations';
  if (lower.includes('multi-strategy') || lower.includes('multi strategy')) return 'Multi-Strategy';
  if (lower.includes('co-invest')) return 'Co-Investment';
  if (lower.includes('renewable') || lower.includes('clean energy') || lower.includes('energy transition')) return 'Renewable Energy';
  if (lower.includes('small cap') || lower.includes('small-cap')) return 'Small-Cap Buyout';
  if (lower.includes('mid cap') || lower.includes('mid-cap') || lower.includes('middle market')) return 'Mid-Cap Buyout';
  return 'Private Equity';
}

function inferGeography(location: string, stateCode: string): string {
  if (!location && !stateCode) return 'Global';
  const lower = (location || '').toLowerCase();

  if (lower.includes('luxembourg') || lower.includes('london') || lower.includes(', uk') ||
      lower.includes('guernsey') || lower.includes('jersey') || lower.includes('ireland') ||
      lower.includes('france') || lower.includes('germany') || lower.includes('amsterdam')) {
    return 'Europe';
  }
  if (lower.includes('hong kong') || lower.includes('singapore') || lower.includes('tokyo') ||
      lower.includes('mumbai') || lower.includes('india') || lower.includes('beijing') ||
      lower.includes('shanghai') || lower.includes('australia') || lower.includes('sydney')) {
    return 'Asia';
  }
  if (lower.includes('grand cayman') || lower.includes('bermuda') || lower.includes('british virgin')) {
    return 'Global';
  }
  if (stateCode && stateCode.length === 2 && /^[A-Z]{2}$/.test(stateCode)) {
    return 'North America';
  }
  return 'Global';
}

function inferSector(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('tech') || lower.includes('software') || lower.includes('digital') ||
      lower.includes('data ') || lower.includes(' ai ') || lower.includes('cyber')) return 'Technology';
  if (lower.includes('healthcare') || lower.includes('pharma') || lower.includes('bio') ||
      lower.includes('life science')) return 'Healthcare';
  if (lower.includes('energy') || lower.includes('renewable') || lower.includes('power') ||
      lower.includes('clean') || lower.includes('solar') || lower.includes('wind')) return 'Energy';
  if (lower.includes('consumer')) return 'Consumer';
  if (lower.includes('financial') || lower.includes('fintech')) return 'Financial Services';
  return 'Sector-Agnostic';
}

function formatAmount(amount: string): string {
  if (!amount || amount === 'Indefinite' || amount === '0') return '';
  const num = parseInt(amount, 10);
  if (isNaN(num) || num <= 0) return '';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)} billion`;
  if (num >= 1_000_000) return `$${Math.round(num / 1_000_000)} million`;
  return `$${num.toLocaleString()}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function buildSecFilingUrl(cik: string): string {
  const cleanCik = cik.replace(/^0+/, '');
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cleanCik}&type=D&dateb=&owner=include&count=10&search_text=&action=getcompany`;
}

interface FormDParsed {
  totalOfferingAmount: string;
  totalAmountSold: string;
  investmentFundType: string;
  placementAgent: string;
}

function parseFormDXml(xmlText: string): FormDParsed | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return null;

    const offering = doc.querySelector('offeringData');
    if (!offering) return null;

    const getText = (parent: Element, tag: string) =>
      parent.querySelector(tag)?.textContent?.trim() || '';

    const amounts = offering.querySelector('offeringSalesAmounts');
    const totalOfferingAmount = amounts ? getText(amounts, 'totalOfferingAmount') : '';
    const totalAmountSold = amounts ? getText(amounts, 'totalAmountSold') : '';
    const investmentFundType = getText(offering, 'investmentFundType');

    const recipientEls = offering.querySelectorAll('salesCompensationList recipientName');
    let placementAgent = 'N/A';
    if (recipientEls.length > 0) {
      const name = recipientEls[0].textContent?.trim();
      if (name && name !== 'None' && name.length > 1) {
        placementAgent = name;
      }
    }

    return { totalOfferingAmount, totalAmountSold, investmentFundType, placementAgent };
  } catch {
    return null;
  }
}

async function fetchFormDXml(cik: string, adsh: string): Promise<FormDParsed | null> {
  const cleanCik = cik.replace(/^0+/, '');
  const cleanAdsh = adsh.replace(/-/g, '');
  try {
    const response = await fetch(`${SEC_PROXY_BASE}/${cleanCik}/${cleanAdsh}/primary_doc.xml`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text.includes('edgarSubmission')) return null;
    return parseFormDXml(text);
  } catch {
    return null;
  }
}

async function enrichWithFormDData(
  hits: { hit: EdgarHit; displayName: string }[],
): Promise<Map<string, FormDParsed>> {
  const enriched = new Map<string, FormDParsed>();

  const batchSize = 5;
  for (let i = 0; i < Math.min(hits.length, 40); i += batchSize) {
    const batch = hits.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(({ hit }) => fetchFormDXml(hit._source.ciks[0], hit._source.adsh)),
    );

    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled' && r.value) {
        enriched.set(batch[j].hit._source.adsh, r.value);
      }
    }

    if (i + batchSize < hits.length) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return enriched;
}

export async function fetchEdgarDeals(): Promise<ClosedDeal[]> {
  const cached = getCachedDeals();
  if (cached) return cached;

  const endDate = new Date().toISOString().split('T')[0];
  const startMs = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const startDate = new Date(startMs).toISOString().split('T')[0];

  const q = encodeURIComponent(
    '"private equity fund" OR "credit fund" OR "infrastructure fund" OR "venture capital fund"',
  );
  const url = `${EFTS_BASE}?q=${q}&forms=D,D/A&dateRange=custom&startdt=${startDate}&enddt=${endDate}&from=0&size=200`;

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`SEC EDGAR search failed: ${response.status}`);

  const data = await response.json();
  const hits: EdgarHit[] = data.hits?.hits || [];
  if (hits.length === 0) throw new Error('No results from SEC EDGAR');

  const seenBases = new Map<string, { hit: EdgarHit; displayName: string }>();
  for (const hit of hits) {
    const raw = hit._source.display_names[0] || '';
    const displayName = cleanDisplayName(raw);
    if (!displayName || displayName.length < 5) continue;

    const baseName = getBaseFundName(displayName);

    const existing = seenBases.get(baseName);
    if (
      !existing ||
      (hit._source.form === 'D/A' && existing.hit._source.form !== 'D/A') ||
      hit._source.file_date > existing.hit._source.file_date
    ) {
      seenBases.set(baseName, { hit, displayName });
    }
  }

  const uniqueEntries = Array.from(seenBases.values()).slice(0, 40);

  let formDMap = new Map<string, FormDParsed>();
  try {
    formDMap = await enrichWithFormDData(uniqueEntries);
  } catch {
    // Proxy unavailable (production) – proceed with EFTS-only data
  }

  const deals: ClosedDeal[] = uniqueEntries.map(({ hit, displayName }) => {
    const src = hit._source;
    const xml = formDMap.get(src.adsh);

    const cleanName = stripEntitySuffix(displayName);
    const location = src.biz_locations[0] || '';
    const stateCode = src.biz_states[0] || '';

    let fundSize: string;
    if (xml) {
      const sold = formatAmount(xml.totalAmountSold);
      const offered = formatAmount(xml.totalOfferingAmount);
      fundSize = sold || offered || `Filed ${formatDateShort(src.file_date)}`;
    } else {
      fundSize = `Filed ${formatDateShort(src.file_date)}`;
    }

    const assetClass = xml?.investmentFundType
      ? xml.investmentFundType.toLowerCase().includes('private equity') ||
        xml.investmentFundType.toLowerCase().includes('venture capital')
        ? 'Private Equity' as const
        : xml.investmentFundType.toLowerCase().includes('hedge')
          ? 'Other' as const
          : inferAssetClass(displayName, src.items)
      : inferAssetClass(displayName, src.items);

    const placementAgent = xml?.placementAgent || 'N/A';

    const filingType = src.form === 'D/A' ? 'amendment' : 'filing';
    const summary = `SEC Form D ${filingType} dated ${formatDateShort(src.file_date)}. ${cleanName} is a ${assetClass.toLowerCase()} fund${location ? ` based in ${location}` : ''}.`;

    return {
      dealName: cleanName,
      placementAgent,
      fundSize,
      assetClass,
      strategy: inferStrategy(displayName),
      sectorFocus: inferSector(displayName),
      geographyFocus: inferGeography(location, stateCode),
      summary,
      sourceUrl: buildSecFilingUrl(src.ciks[0]),
    };
  });

  if (deals.length > 0) cacheDeals(deals);
  return deals;
}
