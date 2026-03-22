import React, { useState } from 'react';
import { Loader2, Layers, Tag, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { categoriseFundStrategy } from '@/services/geminiService';
import type { StrategyClassificationResult } from '@/types';
import { cn } from '@/lib/utils';

export default function StrategyCategorisation() {
  const [strategyText, setStrategyText] = useState('');
  const [strategyResult, setStrategyResult] = useState<StrategyClassificationResult | null>(null);
  const [isCategorising, setIsCategorising] = useState(false);
  const [categorisationError, setCategorisationError] = useState<string | null>(null);

  const handleCategorise = async () => {
    if (!strategyText.trim()) return;
    setIsCategorising(true);
    setCategorisationError(null);
    setStrategyResult(null);

    try {
      const result = await categoriseFundStrategy(strategyText);
      setStrategyResult(result);
    } catch (err) {
      setCategorisationError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsCategorising(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Strategy Categorisation</h1>
        <p className="text-slate-500 mt-1">Paste a fund strategy description to classify it into standardised categories.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Input */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Layers className="h-5 w-5 text-blue-600" />
                Strategy Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste a fund strategy description here (e.g., 'Our fund employs a long/short equity strategy focused on deeply mispriced technology companies in North America...')"
                value={strategyText}
                onChange={(e) => setStrategyText(e.target.value)}
                rows={14}
                className="resize-none"
              />
              <Button
                onClick={handleCategorise}
                disabled={isCategorising || !strategyText.trim()}
                className="w-full"
              >
                {isCategorising ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Categorising...
                  </>
                ) : (
                  'Categorise Strategy'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Results */}
        <div className="col-span-7">
          {isCategorising && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-slate-500 font-medium">Classifying strategy...</p>
              </CardContent>
            </Card>
          )}

          {categorisationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-700 text-sm font-medium">Categorisation failed: {categorisationError}</p>
            </div>
          )}

          {!strategyResult && !isCategorising && !categorisationError && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20">
              <Layers className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-400 font-medium">Classification results will appear here</p>
              <p className="text-slate-300 text-sm mt-1">Paste a strategy description and click categorise</p>
            </div>
          )}

          {strategyResult && !isCategorising && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Original Text */}
                  <div className="col-span-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Input Text</p>
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{strategyText}</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-2 flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-slate-300" />
                  </div>

                  {/* Classification */}
                  <div className="col-span-5 space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Primary Strategy</p>
                      <p className="text-2xl font-bold text-slate-900">{strategyResult.primaryStrategy}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Style Focus</p>
                      <div className="flex flex-wrap gap-2">
                        {strategyResult.styleFocus.map((style) => (
                          <Badge key={style} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                            {style}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {strategyResult.optionalTag && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Geographic / Sector Tag</p>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          <Tag className="h-3 w-3 mr-1" />
                          {strategyResult.optionalTag}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
