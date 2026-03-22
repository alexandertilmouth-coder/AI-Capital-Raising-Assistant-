import React, { useState, useCallback } from 'react';
import { Loader2, Upload, FileSpreadsheet, X, ExternalLink, Linkedin, Database, Users, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { scoreInvestors } from '@/services/geminiService';
import type { CsvInvestor, ScoredInvestor } from '@/types';

const getMatchColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

const getMatchBg = (score: number): string => {
  if (score >= 80) return 'bg-green-600';
  if (score >= 60) return 'bg-blue-600';
  if (score >= 40) return 'bg-yellow-600';
  return 'bg-red-600';
};

export default function InvestorDatabase() {
  const [investorDB, setInvestorDB] = useState<CsvInvestor[]>([]);
  const [investorDBFile, setInvestorDBFile] = useState<File | null>(null);
  const [isParsingDB, setIsParsingDB] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [investorMatchResults, setInvestorMatchResults] = useState<ScoredInvestor[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  const idealInvestorProfile = localStorage.getItem('idealInvestorProfile') || '';

  const handleInvestorDBFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDbError(null);
    setIsParsingDB(true);
    setInvestorDB([]);
    setInvestorDBFile(null);
    setInvestorMatchResults([]);

    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      setDbError('Invalid file type. Please upload a .csv file.');
      setIsParsingDB(false);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error('CSV must have a header row and at least one data row.');
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
          const entry: CsvInvestor = {};
          headers.forEach((header, i) => {
            entry[header] = values[i] || '';
          });
          return entry;
        });
        setInvestorDB(data);
        setInvestorDBFile(file);
      } catch (err: any) {
        setDbError(`Failed to parse CSV: ${err.message}`);
      } finally {
        setIsParsingDB(false);
      }
    };
    reader.onerror = () => {
      setDbError('An error occurred while reading the file.');
      setIsParsingDB(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleScoreInvestors = useCallback(async () => {
    if (!idealInvestorProfile || investorDB.length === 0) {
      setDbError('Cannot score without an ideal investor profile and an investor database.');
      return;
    }
    setIsScoring(true);
    setDbError(null);
    setInvestorMatchResults([]);

    try {
      const results = await scoreInvestors(idealInvestorProfile, investorDB);
      const sortedResults = results.sort((a, b) => b.matchScore - a.matchScore);
      setInvestorMatchResults(sortedResults);
    } catch (err) {
      console.error('Error scoring investors:', err);
      setDbError('An error occurred while scoring investors. Please try again.');
    } finally {
      setIsScoring(false);
    }
  }, [idealInvestorProfile, investorDB]);

  const handleClearDB = () => {
    setInvestorDB([]);
    setInvestorDBFile(null);
    setInvestorMatchResults([]);
    setDbError(null);
  };

  const hasResults = investorMatchResults.length > 0;

  const handleStartOver = () => {
    setInvestorDB([]);
    setInvestorDBFile(null);
    setInvestorMatchResults([]);
    setDbError(null);
  };

  return hasResults ? (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm text-slate-600 truncate">
            {investorDBFile?.name} &middot; {investorMatchResults.length} investors scored
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleStartOver} className="shrink-0 ml-4">
          <RotateCcw className="h-3.5 w-3.5" />
          Start Over
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">
            Investor Match Results ({investorMatchResults.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {investorMatchResults.map((investor, i) => (
            <div key={i} className="border border-slate-100 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h4 className="font-medium text-slate-900">{investor.name}</h4>
                  {investor.companyName && (
                    <p className="text-sm text-slate-500">{investor.companyName}</p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 ${getMatchColor(investor.matchScore)}`}
                >
                  {investor.matchScore}% match
                </Badge>
              </div>

              <div className="mb-3">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getMatchBg(investor.matchScore)}`}
                    style={{ width: `${investor.matchScore}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-3">{investor.reason}</p>

              <div className="flex items-center gap-3">
                {investor.companyUrl && (
                  <a
                    href={investor.companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Website
                  </a>
                )}
                {investor.linkedinUrl && (
                  <a
                    href={investor.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Database className="h-5 w-5 text-blue-600" />
              Investor Database
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Upload a CSV of investors to score against the ideal investor profile.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-md p-3 border ${idealInvestorProfile ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
              <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${idealInvestorProfile ? 'text-green-700' : 'text-yellow-700'}`}>
                Ideal Investor Profile
              </p>
              {idealInvestorProfile ? (
                <p className="text-sm text-green-900 line-clamp-3">{idealInvestorProfile}</p>
              ) : (
                <p className="text-sm text-yellow-900">
                  No profile found. Generate investment materials first to create an ideal investor profile.
                </p>
              )}
            </div>

            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="h-7 w-7 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-blue-600">Upload CSV</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">Investor database file</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleInvestorDBFileChange}
                disabled={isParsingDB}
              />
            </label>

            {isParsingDB && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing CSV...
              </div>
            )}

            {investorDBFile && (
              <div className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm text-slate-700 truncate block">{investorDBFile.name}</span>
                    <span className="text-xs text-slate-400">{investorDB.length} investors loaded</span>
                  </div>
                </div>
                <button
                  onClick={handleClearDB}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <Button
              onClick={handleScoreInvestors}
              disabled={isScoring || !idealInvestorProfile || investorDB.length === 0}
              className="w-full"
              size="lg"
            >
              {isScoring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scoring Investors...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Score Investors
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-7 space-y-6">
        {dbError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-600">{dbError}</p>
          </div>
        )}

        {isScoring && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-500 font-medium">Scoring investors against ideal profile...</p>
            <p className="text-sm text-slate-400 mt-1">This may take 20-40 seconds</p>
          </div>
        )}

        {!isScoring && !dbError && (
          <div className="flex items-center justify-center min-h-[300px] rounded-lg border-2 border-dashed border-slate-200 bg-white">
            <div className="text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Scored Investors Will Appear Here</p>
              <p className="text-sm text-slate-300 mt-1">Upload a CSV and click score to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
