import React, { useState, useCallback, useEffect } from 'react';
import {
  Loader2, Upload, FileText, X, Eye, ExternalLink, Linkedin,
  BookOpen, Target, ShieldCheck, Users, TrendingUp, Mail,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  generateSummary, generateTeaser, identifyInvestors, identifyRecentTransactions,
  generateFcaEmail, generateDiligenceQuestions,
  INVESTOR_ANALYSIS_PROMPT, FCA_EMAIL_PROMPT,
} from '@/services/geminiService';
import { renderMarkdown } from '@/lib/markdown';
import CopyButton from '@/components/CopyButton';
import type { Document, Investor, Transaction } from '@/types';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function InvestmentMaterials() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [summary, setSummary] = useState('');
  const [teaser, setTeaser] = useState('');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [idealInvestorProfile, setIdealInvestorProfile] = useState('');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [fcaEmail, setFcaEmail] = useState('');
  const [diligenceQuestions, setDiligenceQuestions] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [emailPromptModalOpen, setEmailPromptModalOpen] = useState(false);

  useEffect(() => {
    if (idealInvestorProfile) {
      localStorage.setItem('idealInvestorProfile', idealInvestorProfile);
    }
  }, [idealInvestorProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsParsing(true);

    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<{ file: File; text: string }>((resolve, reject) => {
        const allowedExtensions = ['.txt', '.md', '.pdf'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!['text/plain', 'text/markdown', 'application/pdf'].includes(file.type) && !allowedExtensions.includes(fileExtension)) {
          return reject(new Error(`Invalid file type for ${file.name}. Please upload .txt, .md, or .pdf files.`));
        }

        if (file.size > 10 * 1024 * 1024) {
          return reject(new Error(`${file.name} is too large. Max 10MB.`));
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`An error occurred while reading ${file.name}.`));

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          reader.onload = async (event) => {
            try {
              const arrayBuffer = event.target?.result as ArrayBuffer;
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              let fullText = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(' ');
                fullText += pageText + '\n\n';
              }
              resolve({ file, text: fullText });
            } catch {
              reject(new Error(`Failed to parse ${file.name}. It might be corrupted or protected.`));
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          reader.onload = (event) => {
            resolve({ file, text: event.target?.result as string });
          };
          reader.readAsText(file);
        }
      });
    });

    Promise.all(filePromises)
      .then(parsedFiles => {
        const newDocuments: Document[] = parsedFiles.map(pf => ({
          id: `${pf.file.name}-${pf.file.lastModified}`,
          file: pf.file,
          text: pf.text,
        }));

        setDocuments(prev => {
          const existingIds = new Set(prev.map(doc => doc.id));
          const uniqueNewDocs = newDocuments.filter(doc => !existingIds.has(doc.id));
          return [...prev, ...uniqueNewDocs];
        });
      })
      .catch(err => setError(err.message))
      .finally(() => {
        setIsParsing(false);
        e.target.value = '';
      });
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(docs => docs.filter(doc => doc.id !== id));
  };

  const handleGenerate = useCallback(async () => {
    if (documents.length === 0) {
      setError('Please upload at least one document before generating.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary('');
    setTeaser('');
    setInvestors([]);
    setIdealInvestorProfile('');
    setRecentTransactions([]);
    setFcaEmail('');
    setDiligenceQuestions([]);

    const combinedText = documents
      .map(doc => `--- START OF DOCUMENT: ${doc.file.name} ---\n\n${doc.text}\n\n--- END OF DOCUMENT: ${doc.file.name} ---`)
      .join('\n\n');

    try {
      const [summaryRes, teaserRes, investorsRes, transactionsRes, emailRes, diligenceRes] = await Promise.all([
        generateSummary(combinedText),
        generateTeaser(combinedText),
        identifyInvestors(combinedText),
        identifyRecentTransactions(combinedText),
        generateFcaEmail(combinedText),
        generateDiligenceQuestions(combinedText),
      ]);

      setSummary(summaryRes);
      setTeaser(teaserRes);
      setInvestors(investorsRes.investors);
      setIdealInvestorProfile(investorsRes.idealProfile);
      setRecentTransactions(transactionsRes);
      setFcaEmail(emailRes);
      setDiligenceQuestions(diligenceRes);
    } catch (err) {
      console.error('Error generating materials:', err);
      setError('An error occurred while generating the materials. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [documents]);

  const hasResults = summary || teaser || investors.length > 0 || diligenceQuestions.length > 0;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Upload & Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Upload className="h-5 w-5 text-blue-600" />
                Upload Documents
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Upload investment memoranda (.pdf, .txt, .md) to generate materials.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF, TXT, MD up to 10MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md"
                  multiple
                  onChange={handleFileChange}
                  disabled={isParsing}
                />
              </label>

              {isParsing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing documents...
                </div>
              )}

              {documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Active Documents ({documents.length})</p>
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{doc.file.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isLoading || documents.length === 0}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Materials...
                  </>
                ) : (
                  'Generate Investment Materials'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500 font-medium">Generating investment materials...</p>
              <p className="text-sm text-slate-400 mt-1">This may take 30-60 seconds</p>
            </div>
          )}

          {!hasResults && !isLoading && !error && (
            <div className="flex items-center justify-center min-h-[300px] rounded-lg border-2 border-dashed border-slate-200 bg-white">
              <div className="text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Results Will Appear Here</p>
                <p className="text-sm text-slate-300 mt-1">Upload documents and click generate to begin</p>
              </div>
            </div>
          )}

          {/* Investment Summary */}
          {summary && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Investment Summary
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPromptModalOpen(true)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <CopyButton textToCopy={summary} />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
                />
              </CardContent>
            </Card>
          )}

          {/* Blind Investment Teaser */}
          {teaser && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Target className="h-5 w-5 text-blue-600" />
                  Blind Investment Teaser
                </CardTitle>
                <CopyButton textToCopy={teaser} />
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(teaser) }}
                />
              </CardContent>
            </Card>
          )}

          {/* Due Diligence Report */}
          {diligenceQuestions.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Due Diligence Report
                </CardTitle>
                <CopyButton textToCopy={diligenceQuestions.join('\n')} />
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {diligenceQuestions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                      <span className="text-blue-600 font-bold shrink-0">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Potential Investors */}
          {investors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5 text-blue-600" />
                  Potential Investors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {idealInvestorProfile && (
                  <div className="rounded-md bg-blue-50 border border-blue-100 p-3 mb-4">
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Ideal Investor Profile</p>
                    <p className="text-sm text-blue-900">{idealInvestorProfile}</p>
                  </div>
                )}
                {investors.map((investor, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-slate-900">{investor.name}</h4>
                        <p className="text-sm text-slate-500">{investor.companyName}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {investor.weighting}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{investor.reason}</p>
                    <p className="text-xs text-slate-400 mb-3">Focus: {investor.focus}</p>
                    <div className="flex items-center gap-3">
                      {investor.companyUrl && (
                        <a href={investor.companyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {investor.linkedinUrl && (
                        <a href={investor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentTransactions.map((tx, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-1">{tx.name}</h4>
                    <p className="text-sm text-slate-600 mb-3">{tx.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{tx.geography}</Badge>
                      <Badge variant="secondary">{tx.assetClass}</Badge>
                      <Badge variant="default">{tx.dealSize}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* FCA Compliant Email */}
          {fcaEmail && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Mail className="h-5 w-5 text-blue-600" />
                  FCA Compliant Email
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEmailPromptModalOpen(true)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <CopyButton textToCopy={fcaEmail} />
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-md p-4 font-sans leading-relaxed">
                  {fcaEmail}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Prompt Modal - Investor Analysis */}
      <Dialog open={promptModalOpen} onOpenChange={setPromptModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Investor Analysis Prompt</DialogTitle>
            <DialogDescription>The system prompt used to identify potential investors.</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 rounded-md p-4 leading-relaxed">
            {INVESTOR_ANALYSIS_PROMPT}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Prompt Modal - FCA Email */}
      <Dialog open={emailPromptModalOpen} onOpenChange={setEmailPromptModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FCA Email Prompt</DialogTitle>
            <DialogDescription>The system prompt used to generate the FCA compliant email.</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 rounded-md p-4 leading-relaxed">
            {FCA_EMAIL_PROMPT}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
