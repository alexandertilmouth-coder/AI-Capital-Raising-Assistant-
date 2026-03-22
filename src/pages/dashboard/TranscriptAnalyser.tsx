import React, { useState } from 'react';
import { Loader2, FileText, User, Briefcase, MapPin, TrendingUp, Star, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { analyzeTranscript } from '@/services/geminiService';
import type { TranscriptAnalysisResult } from '@/types';
import { renderMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';

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

export default function TranscriptAnalyser() {
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptAnalysisResult, setTranscriptAnalysisResult] = useState<TranscriptAnalysisResult | null>(null);
  const [isAnalyzingTranscript, setIsAnalyzingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!transcriptText.trim()) return;
    setIsAnalyzingTranscript(true);
    setTranscriptError(null);
    setTranscriptAnalysisResult(null);

    try {
      const result = await analyzeTranscript(transcriptText);
      setTranscriptAnalysisResult(result);
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsAnalyzingTranscript(false);
    }
  };

  const md = transcriptAnalysisResult?.meetingData;

  const investorFields = md ? [
    { label: 'Name', value: `${md.firstName} ${md.lastName}`.trim() || 'N/A' },
    { label: 'Company', value: md.companyName },
    { label: 'Fund Name', value: md.fundName },
    { label: 'Asset Class', value: md.assetClass },
    { label: 'Geography', value: md.geography },
    { label: 'Sector Focus', value: md.sectorFocus },
    { label: 'Location', value: md.location },
    { label: 'Ticket Size', value: md.ticketSize ? `$${md.ticketSize}M` : 'N/A' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transcript Analyser</h1>
        <p className="text-slate-500 mt-1">Paste a meeting transcript for AI-powered debrief and performance coaching.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Input */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-blue-600" />
                Meeting Transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your meeting transcript here..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                rows={14}
                className="resize-none"
              />
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzingTranscript || !transcriptText.trim()}
                className="w-full"
              >
                {isAnalyzingTranscript ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing Transcript...
                  </>
                ) : (
                  'Analyze Transcript'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Results */}
        <div className="col-span-7">
          {isAnalyzingTranscript && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-slate-500 font-medium">Analysing transcript — this may take a moment...</p>
              </CardContent>
            </Card>
          )}

          {transcriptError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-700 text-sm font-medium">Analysis failed: {transcriptError}</p>
            </div>
          )}

          {!transcriptAnalysisResult && !isAnalyzingTranscript && !transcriptError && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20">
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-400 font-medium">Results will appear here</p>
              <p className="text-slate-300 text-sm mt-1">Paste a transcript and click analyse</p>
            </div>
          )}

          {transcriptAnalysisResult && !isAnalyzingTranscript && (
            <div className="space-y-4">
              {/* Investor Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <User className="h-4 w-4 text-blue-600" />
                    Investor Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {investorFields.map((field) => (
                      <div key={field.label} className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-sm font-medium text-slate-500">{field.label}</span>
                        <span className="text-sm text-slate-900 font-medium">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Meeting Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Meeting Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm leading-relaxed">{transcriptAnalysisResult.meetingSummary}</p>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(transcriptAnalysisResult.nextSteps) }}
                  />
                </CardContent>
              </Card>

              {/* Performance Coaching */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Performance Coaching
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Overall Score */}
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Overall Performance Score</p>
                    <div className="flex items-end gap-3 mb-2">
                      <span className={cn('text-4xl font-bold', getScoreColor(transcriptAnalysisResult.overallScore))}>
                        {transcriptAnalysisResult.overallScore}
                      </span>
                      <span className="text-slate-400 text-sm mb-1">/ 100</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn('h-full transition-all duration-500', getScoreBarColor(transcriptAnalysisResult.overallScore))}
                        style={{ width: `${transcriptAnalysisResult.overallScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-slate-600 text-sm">{transcriptAnalysisResult.summary}</p>

                  {/* Strengths */}
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-green-800 text-sm">Key Strengths</h4>
                    </div>
                    <div
                      className="prose prose-sm prose-green max-w-none text-green-700"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(transcriptAnalysisResult.strengths) }}
                    />
                  </div>

                  {/* Areas for Improvement */}
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-800 text-sm">Areas for Improvement</h4>
                    </div>
                    <div
                      className="prose prose-sm prose-yellow max-w-none text-yellow-700"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(transcriptAnalysisResult.areasForImprovement) }}
                    />
                  </div>

                  {/* Actionable Suggestions */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-slate-900 text-sm">Actionable Suggestions</h4>
                    </div>
                    <div
                      className="prose prose-sm prose-slate max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(transcriptAnalysisResult.actionableSuggestions) }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
