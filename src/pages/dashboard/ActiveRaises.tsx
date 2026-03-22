import React, { useState } from 'react';
import { Loader2, SlidersHorizontal, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PredictorInputs {
  fundSize: number;
  vintageYear: number;
  netIRR: number;
  dpi: number;
  moic: number;
  deploymentPct: number;
}

interface PredictiveFactor {
  name: string;
  passed: boolean;
  status: string;
  points: number;
}

interface PredictionResult {
  score: number;
  factors: PredictiveFactor[];
}

const CURRENT_YEAR = new Date().getFullYear();

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-sky-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-sky-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value}MM`;
}

function computePrediction(inputs: PredictorInputs): PredictionResult {
  const fundAge = CURRENT_YEAR - inputs.vintageYear;
  const factors: PredictiveFactor[] = [];

  const irrPassed = inputs.netIRR > 15;
  factors.push({
    name: 'Strong Performance',
    passed: irrPassed,
    status: `Net IRR ${inputs.netIRR}% ${irrPassed ? '>' : '≤'} 15%`,
    points: irrPassed ? 30 : 0,
  });

  const dpiPassed = inputs.dpi > 0.5;
  factors.push({
    name: 'Significant Distributions',
    passed: dpiPassed,
    status: `DPI ${inputs.dpi.toFixed(2)}x ${dpiPassed ? '>' : '≤'} 0.5x`,
    points: dpiPassed ? 20 : 0,
  });

  const moicPassed = inputs.moic > 1.5;
  factors.push({
    name: 'Value Creation',
    passed: moicPassed,
    status: `MOIC ${inputs.moic.toFixed(2)}x ${moicPassed ? '>' : '≤'} 1.5x`,
    points: moicPassed ? 20 : 0,
  });

  const deployPassed = inputs.deploymentPct > 60;
  factors.push({
    name: 'Sufficiently Deployed',
    passed: deployPassed,
    status: `${inputs.deploymentPct}% ${deployPassed ? '>' : '≤'} 60%`,
    points: deployPassed ? 15 : 0,
  });

  const agePassed = fundAge >= 3 && fundAge <= 7;
  factors.push({
    name: 'Fundraising Window',
    passed: agePassed,
    status: `Age ${fundAge}yr ${agePassed ? 'within' : 'outside'} 3-7yr window`,
    points: agePassed ? 15 : 0,
  });

  const score = factors.reduce((sum, f) => sum + f.points, 0);

  return { score, factors };
}

export default function ActiveRaises() {
  const [predictorInputs, setPredictorInputs] = useState<PredictorInputs>({
    fundSize: 500,
    vintageYear: 2019,
    netIRR: 18,
    dpi: 0.8,
    moic: 1.8,
    deploymentPct: 75,
  });
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const handlePredict = () => {
    setIsPredicting(true);
    setPredictionResult(null);
    setTimeout(() => {
      const result = computePrediction(predictorInputs);
      setPredictionResult(result);
      setIsPredicting(false);
    }, 500);
  };

  const updateInput = (key: keyof PredictorInputs, value: number) => {
    setPredictorInputs((prev) => ({ ...prev, [key]: value }));
  };

  const sliders: {
    key: keyof PredictorInputs;
    label: string;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
  }[] = [
    { key: 'fundSize', label: 'Fund Size', min: 10, max: 5000, step: 10, format: formatCurrency },
    { key: 'vintageYear', label: 'Vintage Year', min: 2005, max: CURRENT_YEAR, step: 1, format: (v) => String(v) },
    { key: 'netIRR', label: 'Net IRR (%)', min: -20, max: 50, step: 1, format: (v) => `${v}%` },
    { key: 'dpi', label: 'DPI', min: 0, max: 3, step: 0.05, format: (v) => `${v.toFixed(2)}x` },
    { key: 'moic', label: 'MOIC', min: 0, max: 5, step: 0.1, format: (v) => `${v.toFixed(2)}x` },
    { key: 'deploymentPct', label: 'Deployment (%)', min: 0, max: 100, step: 1, format: (v) => `${v}%` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Active Raises Predictor</h1>
        <p className="text-slate-500 mt-1">Adjust fund metrics to predict the likelihood of an active capital raise.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Inputs */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                Fund Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {sliders.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">{s.label}</label>
                    <span className="text-sm font-semibold text-blue-600">
                      {s.format(predictorInputs[s.key])}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={predictorInputs[s.key]}
                    onChange={(e) => updateInput(s.key, parseFloat(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-blue-600"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">{s.format(s.min)}</span>
                    <span className="text-xs text-slate-400">{s.format(s.max)}</span>
                  </div>
                </div>
              ))}

              <Button onClick={handlePredict} disabled={isPredicting} className="w-full mt-2">
                {isPredicting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  'Predict Likelihood'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Results */}
        <div className="col-span-7">
          {isPredicting && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-slate-500 font-medium">Running prediction model...</p>
              </CardContent>
            </Card>
          )}

          {!predictionResult && !isPredicting && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20">
              <SlidersHorizontal className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-400 font-medium">Prediction results will appear here</p>
              <p className="text-slate-300 text-sm mt-1">Adjust the sliders and click predict</p>
            </div>
          )}

          {predictionResult && !isPredicting && (
            <div className="space-y-4">
              {/* Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <p className="text-sm font-medium text-slate-500 mb-1">Raise Likelihood Score</p>
                    <p className={cn('text-6xl font-bold', getScoreColor(predictionResult.score))}>
                      {predictionResult.score}
                    </p>
                    <p className={cn(
                      'text-lg font-semibold mt-1',
                      predictionResult.score >= 50 ? 'text-green-600' : 'text-red-500'
                    )}>
                      {predictionResult.score >= 50 ? 'High Likelihood' : 'Low Likelihood'}
                    </p>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full transition-all duration-500', getScoreBarColor(predictionResult.score))}
                      style={{ width: `${predictionResult.score}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Predictive Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-900">Key Predictive Factors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {predictionResult.factors.map((factor) => (
                    <div
                      key={factor.name}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3',
                        factor.passed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {factor.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <p className={cn('text-sm font-semibold', factor.passed ? 'text-green-800' : 'text-slate-600')}>
                            {factor.name}
                          </p>
                          <p className={cn('text-xs', factor.passed ? 'text-green-600' : 'text-slate-400')}>
                            {factor.status}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-sm font-bold',
                        factor.passed ? 'text-green-600' : 'text-slate-400'
                      )}>
                        +{factor.points} pts
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
