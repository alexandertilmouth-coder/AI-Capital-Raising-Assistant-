import React, { useState } from 'react';
import { Loader2, MessageSquareText, Target, Brain, ArrowRight, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { analyzeInvestorFeedback } from '@/services/geminiService';
import type { FeedbackAnalysisResult } from '@/types';
import { cn } from '@/lib/utils';

const INTENT_BADGE_STYLES: Record<string, string> = {
  'High Intent': 'bg-green-100 text-green-700 border-green-200',
  'Medium Intent': 'bg-blue-100 text-blue-700 border-blue-200',
  'Qualification/Questions': 'bg-sky-100 text-sky-700 border-sky-200',
  'Mid Low Intent': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Low Intent': 'bg-red-100 text-red-700 border-red-200',
};

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

export default function InvestorFeedback() {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackResult, setFeedbackResult] = useState<FeedbackAnalysisResult | null>(null);
  const [isAnalyzingFeedback, setIsAnalyzingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!feedbackText.trim()) return;
    setIsAnalyzingFeedback(true);
    setFeedbackError(null);
    setFeedbackResult(null);

    let documentContext = '';
    try {
      const storedDocs = localStorage.getItem('uploadedDocuments');
      if (storedDocs) {
        const docs = JSON.parse(storedDocs);
        if (Array.isArray(docs)) {
          documentContext = docs.map((d: { text?: string }) => d.text || '').join('\n\n');
        }
      }
    } catch {
      // localStorage read failed silently
    }

    try {
      const result = await analyzeInvestorFeedback(feedbackText, documentContext);
      setFeedbackResult(result);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsAnalyzingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Investor Feedback Analyser</h1>
        <p className="text-slate-500 mt-1">Paste an investor's email reply to analyse their intent and interest level.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Input */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <MessageSquareText className="h-5 w-5 text-blue-600" />
                Investor Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste the investor's email reply here..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={14}
                className="resize-none"
              />
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzingFeedback || !feedbackText.trim()}
                className="w-full"
              >
                {isAnalyzingFeedback ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing...
                  </>
                ) : (
                  'Analyze Feedback'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Results */}
        <div className="col-span-7">
          {isAnalyzingFeedback && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-slate-500 font-medium">Analysing investor sentiment...</p>
              </CardContent>
            </Card>
          )}

          {feedbackError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-700 text-sm font-medium">Analysis failed: {feedbackError}</p>
            </div>
          )}

          {!feedbackResult && !isAnalyzingFeedback && !feedbackError && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20">
              <Target className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-400 font-medium">Results will appear here</p>
              <p className="text-slate-300 text-sm mt-1">Paste an investor email and click analyse</p>
            </div>
          )}

          {feedbackResult && !isAnalyzingFeedback && (
            <div className="space-y-4">
              {/* Score & Intent */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Interest Score</p>
                      <p className={cn('text-5xl font-bold', getScoreColor(feedbackResult.interestScore))}>
                        {feedbackResult.interestScore}
                      </p>
                    </div>
                    <Badge className={cn('text-sm', INTENT_BADGE_STYLES[feedbackResult.intentCategory] || 'bg-slate-100 text-slate-700')}>
                      {feedbackResult.intentCategory}
                    </Badge>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full transition-all duration-500', getScoreBarColor(feedbackResult.interestScore))}
                      style={{ width: `${feedbackResult.interestScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Reasoning */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Brain className="h-4 w-4 text-blue-600" />
                    AI Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 italic">{feedbackResult.reasoning}</p>
                </CardContent>
              </Card>

              {/* Suggested Next Step */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                    Suggested Next Step
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-600 font-bold">{feedbackResult.nextStep}</p>
                </CardContent>
              </Card>

              {/* Question Analysis */}
              {feedbackResult.questionsAndAnswers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <HelpCircle className="h-4 w-4 text-blue-600" />
                      Question Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {feedbackResult.questionsAndAnswers.map((qa, i) => {
                      const isActionRequired = qa.answer.startsWith('ACTION_REQUIRED');
                      return (
                        <div
                          key={i}
                          className={cn(
                            'rounded-lg p-4 border',
                            isActionRequired
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-green-50 border-green-200'
                          )}
                        >
                          <p className="font-semibold text-slate-900 text-sm mb-1">
                            Q: {qa.question}
                          </p>
                          <p className={cn(
                            'text-sm',
                            isActionRequired ? 'text-amber-700 font-medium' : 'text-green-700'
                          )}>
                            A: {qa.answer}
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
