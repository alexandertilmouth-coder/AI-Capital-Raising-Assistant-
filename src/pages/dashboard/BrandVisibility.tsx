import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, Globe, BarChart3, Shield, TrendingUp, Search, Users, Calculator, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { generatePbvScoreData } from '@/services/geminiService';
import type { PbvResult, PbvFirmData, PbvMetrics } from '@/types';

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-blue-600';
  if (score >= 4) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBg = (score: number): string => {
  if (score >= 8) return 'bg-green-600';
  if (score >= 6) return 'bg-blue-600';
  if (score >= 4) return 'bg-yellow-600';
  return 'bg-red-600';
};

const calculatePbvDecileScore = (series: number[], higherIsBetter = true): number[] => {
  const N = series.length;
  if (N === 0) return [];

  const indexedSeries = series.map((value, originalIndex) => ({ value, originalIndex }));

  indexedSeries.sort((a, b) => {
    if (a.value === b.value) return 0;
    return higherIsBetter ? b.value - a.value : a.value - b.value;
  });

  const tempRanks = new Array(N);
  for (let i = 0; i < N; i++) {
    if (i > 0 && indexedSeries[i].value === indexedSeries[i - 1].value) {
      tempRanks[i] = tempRanks[i - 1];
    } else {
      tempRanks[i] = i + 1;
    }
  }

  const ranks = new Array(N);
  indexedSeries.forEach((item, i) => {
    ranks[item.originalIndex] = tempRanks[i];
  });

  const initialDeciles = ranks.map(rank => {
    const decile = Math.ceil((N - rank + 1) / (N / 10));
    return Math.max(1, Math.min(10, decile));
  });

  const tempStructure = series.map((value, index) => ({
    rawValue: value,
    initialDecile: initialDeciles[index],
  }));

  const grouped = tempStructure.reduce((acc, item) => {
    const key = item.rawValue.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item.initialDecile);
    return acc;
  }, {} as Record<string, number[]>);

  const avgDecileByValue = new Map<number, number>();
  Object.entries(grouped).forEach(([rawValueStr, deciles]) => {
    const rawValue = parseFloat(rawValueStr);
    const average = deciles.reduce((sum, d) => sum + d, 0) / deciles.length;
    avgDecileByValue.set(rawValue, average);
  });

  const finalScores = series.map(rawValue => avgDecileByValue.get(rawValue) || 0);
  return finalScores.map(score => {
    const rounded = Math.round(score * 100) / 100;
    return Math.max(1, Math.min(10, rounded));
  });
};

export default function BrandVisibility() {
  const [pbvUrl, setPbvUrl] = useState('');
  const [pbvResult, setPbvResult] = useState<PbvResult | null>(null);
  const [isAnalyzingPbv, setIsAnalyzingPbv] = useState(false);
  const [pbvError, setPbvError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadingSteps = [
    { icon: Search, label: 'Researching firm via web search...' },
    { icon: Users, label: 'Building peer group & estimating metrics...' },
    { icon: BarChart3, label: 'Structuring data across 10 firms...' },
    { icon: Calculator, label: 'Computing decile scores...' },
  ];

  useEffect(() => {
    if (isAnalyzingPbv) {
      setLoadingStep(0);
      let step = 0;
      stepTimerRef.current = setInterval(() => {
        step += 1;
        if (step < loadingSteps.length) {
          setLoadingStep(step);
        }
      }, 6000);
    } else {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [isAnalyzingPbv]);

  const handleGeneratePbvScore = useCallback(async () => {
    if (!pbvUrl.trim() || !pbvUrl.includes('.')) {
      setPbvError('Please enter a valid company website URL.');
      return;
    }
    setIsAnalyzingPbv(true);
    setPbvError(null);
    setPbvResult(null);

    try {
      const firmsData = await generatePbvScoreData(pbvUrl);

      if (!firmsData || !Array.isArray(firmsData) || firmsData.length === 0) {
        throw new Error('AI failed to return valid data. The website may be inaccessible or the topic too niche for analysis.');
      }

      const originalTargetFirmName = firmsData[0]?.firmName;
      if (!originalTargetFirmName) {
        throw new Error('AI response was malformed and did not include the target firm\'s name.');
      }

      const metricKeys: (keyof PbvMetrics)[] = [
        'searchVolumeIndex', 'newsMentions', 'socialMediaEngagement',
        'regulatoryActionCount', 'seniorProfilesCount', 'websiteTransparencyScore',
        'fundLaunchCount3Y', 'peerFundSizeMM', 'industryRankingPresence',
      ];

      const validatedFirmsData = firmsData.reduce((acc: PbvFirmData[], firm) => {
        if (!firm || typeof firm !== 'object' || !firm.metrics) return acc;

        const cleanMetrics: Partial<PbvMetrics> = {};
        let allMetricsValid = true;

        for (const key of metricKeys) {
          const rawValue = firm.metrics[key];
          const numValue = parseFloat(rawValue as any);
          if (isNaN(numValue)) {
            allMetricsValid = false;
            break;
          }
          cleanMetrics[key] = numValue;
        }

        if (allMetricsValid) {
          acc.push({ ...firm, metrics: cleanMetrics as PbvMetrics });
        }
        return acc;
      }, []);

      if (validatedFirmsData.length < 2) {
        throw new Error('AI could not generate enough valid data for a comparative analysis. Please try a different URL.');
      }

      const targetFirmInValidatedList = validatedFirmsData.find(f => f.firmName === originalTargetFirmName);
      if (!targetFirmInValidatedList) {
        throw new Error('The data for the target firm was invalid and could not be processed. Please try again.');
      }

      const finalFirmsForScoring = [
        targetFirmInValidatedList,
        ...validatedFirmsData.filter(f => f.firmName !== originalTargetFirmName),
      ];

      const targetFirm = finalFirmsForScoring[0];
      const decileScoresByMetric: { [key: string]: number[] } = {};

      for (const key of metricKeys) {
        const values = finalFirmsForScoring.map(f => f.metrics[key]);
        const higherIsBetter = key !== 'regulatoryActionCount';
        decileScoresByMetric[key] = calculatePbvDecileScore(values, higherIsBetter);
      }

      const targetDecileScores: { [key: string]: number } = {};
      metricKeys.forEach(key => {
        targetDecileScores[key] = decileScoresByMetric[key][0];
      });

      const MAI_Score = (targetDecileScores.searchVolumeIndex + targetDecileScores.newsMentions + targetDecileScores.socialMediaEngagement) / 3;
      const PCI_Score = (targetDecileScores.regulatoryActionCount + targetDecileScores.seniorProfilesCount + targetDecileScores.websiteTransparencyScore) / 3;
      const OSI_Score = (targetDecileScores.fundLaunchCount3Y + targetDecileScores.peerFundSizeMM + targetDecileScores.industryRankingPresence) / 3;
      const PBV_Composite_Score = (MAI_Score + PCI_Score + OSI_Score) / 3;

      setPbvResult({
        firmName: targetFirm.firmName,
        pbvScore: parseFloat(PBV_Composite_Score.toFixed(2)),
        maiScore: parseFloat(MAI_Score.toFixed(2)),
        pciScore: parseFloat(PCI_Score.toFixed(2)),
        osiScore: parseFloat(OSI_Score.toFixed(2)),
        detailedScores: [
          { name: 'Search Volume', score: targetDecileScores.searchVolumeIndex, rationale: targetFirm.rationales?.searchVolumeIndex ?? 'N/A' },
          { name: 'News Mentions', score: targetDecileScores.newsMentions, rationale: targetFirm.rationales?.newsMentions ?? 'N/A' },
          { name: 'Social Media Engagement', score: targetDecileScores.socialMediaEngagement, rationale: targetFirm.rationales?.socialMediaEngagement ?? 'N/A' },
          { name: 'Regulatory Track Record', score: targetDecileScores.regulatoryActionCount, rationale: targetFirm.rationales?.regulatoryActionCount ?? 'N/A' },
          { name: 'Senior Team Tenure', score: targetDecileScores.seniorProfilesCount, rationale: targetFirm.rationales?.seniorProfilesCount ?? 'N/A' },
          { name: 'Website Transparency', score: targetDecileScores.websiteTransparencyScore, rationale: targetFirm.rationales?.websiteTransparencyScore ?? 'N/A' },
          { name: 'Recent Fund Launches', score: targetDecileScores.fundLaunchCount3Y, rationale: targetFirm.rationales?.fundLaunchCount3Y ?? 'N/A' },
          { name: 'Peer Fund Size', score: targetDecileScores.peerFundSizeMM, rationale: targetFirm.rationales?.peerFundSizeMM ?? 'N/A' },
          { name: 'Industry Rankings', score: targetDecileScores.industryRankingPresence, rationale: targetFirm.rationales?.industryRankingPresence ?? 'N/A' },
        ],
      });
    } catch (err: any) {
      setPbvError(err.message || 'An error occurred while analyzing the brand. Please try again.');
    } finally {
      setIsAnalyzingPbv(false);
    }
  }, [pbvUrl]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column - Input */}
      <div className="lg:col-span-5 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Globe className="h-5 w-5 text-blue-600" />
              Public Brand Visibility Score
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Analyze a fund manager's online brand presence relative to peers using a decile-scoring methodology.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="pbv-url" className="block text-sm font-medium text-slate-700 mb-1.5">
                Fund Manager Website URL
              </label>
              <Input
                id="pbv-url"
                type="url"
                placeholder="e.g., https://www.bridgepoint.eu"
                value={pbvUrl}
                onChange={(e) => setPbvUrl(e.target.value)}
                disabled={isAnalyzingPbv}
              />
            </div>
            <Button
              onClick={handleGeneratePbvScore}
              disabled={isAnalyzingPbv || !pbvUrl.trim()}
              className="w-full"
              size="lg"
            >
              {isAnalyzingPbv ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Brand...
                </>
              ) : (
                'Generate PBV Score'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Results */}
      <div className="lg:col-span-7 space-y-6">
        {pbvError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-600">{pbvError}</p>
          </div>
        )}

        {isAnalyzingPbv && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Analyzing Brand Visibility</h3>
                <p className="text-sm text-slate-500 mt-1">This typically takes 20–40 seconds</p>
              </div>

              <div className="max-w-sm mx-auto">
                <Progress value={((loadingStep + 1) / loadingSteps.length) * 100} className="h-2 mb-6" />

                <div className="space-y-3">
                  {loadingSteps.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = i === loadingStep;
                    const isDone = i < loadingStep;

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
                          isActive ? 'bg-blue-50 text-blue-700' : isDone ? 'text-slate-400' : 'text-slate-300'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        ) : (
                          <StepIcon className="h-4 w-4 shrink-0" />
                        )}
                        <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!pbvResult && !isAnalyzingPbv && !pbvError && (
          <div className="flex items-center justify-center min-h-[300px] rounded-lg border-2 border-dashed border-slate-200 bg-white">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">PBV Score Will Appear Here</p>
              <p className="text-sm text-slate-300 mt-1">Enter a URL and click generate to begin</p>
            </div>
          </div>
        )}

        {pbvResult && !isAnalyzingPbv && (
          <>
            {/* Composite Score */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-500 mb-1">Composite PBV Score for</p>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">{pbvResult.firmName}</h3>
                <div className="text-center">
                  <p className={`text-7xl font-bold ${getScoreColor(pbvResult.pbvScore)}`}>
                    {pbvResult.pbvScore}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">out of 10</p>
                </div>
              </CardContent>
            </Card>

            {/* Sub-Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">MAI Score</p>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">Market Awareness</p>
                  <p className={`text-3xl font-bold ${getScoreColor(pbvResult.maiScore)}`}>
                    {pbvResult.maiScore}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">PCI Score</p>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">Professional Credibility</p>
                  <p className={`text-3xl font-bold ${getScoreColor(pbvResult.pciScore)}`}>
                    {pbvResult.pciScore}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">OSI Score</p>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">Operational Scale</p>
                  <p className={`text-3xl font-bold ${getScoreColor(pbvResult.osiScore)}`}>
                    {pbvResult.osiScore}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Detailed Metric Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {pbvResult.detailedScores.map((metric) => (
                  <div key={metric.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{metric.name}</span>
                      <span className={`text-sm font-bold ${getScoreColor(metric.score)}`}>
                        {metric.score.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${getScoreBg(metric.score)}`}
                        style={{ width: `${(metric.score / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">{metric.rationale}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
