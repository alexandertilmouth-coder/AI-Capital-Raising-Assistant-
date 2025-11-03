
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { generateSummary, generateTeaser, identifyInvestors, INVESTOR_ANALYSIS_PROMPT, identifyRecentTransactions, generateFcaEmail, FCA_EMAIL_PROMPT, generateDiligenceQuestions, scoreInvestors, analyzeInvestorFeedback, analyzeTranscript, findClosedDeals, generateMarketAppetiteAnalysis, categoriseFundStrategy } from './services/geminiService';
import { Investor, Document, Transaction, CsvInvestor, ScoredInvestor, FeedbackAnalysisResult, TranscriptAnalysisResult, ClosedDeal, StrategyClassificationResult } from './types';
import { initialDeals, initialMarketAppetite } from './data/initialData';
import Header from './components/Header';
import Card from './components/Card';
import LoadingSpinner from './components/LoadingSpinner';
import CopyButton from './components/CopyButton';
import Modal from './components/Modal';
import PieChart from './components/PieChart';


declare const pdfjsLib: any;
declare const marked: any;

const TabButton = ({ label, isActive, onClick }: {label: string; isActive: boolean; onClick: () => void}) => (
    <button
        onClick={onClick}
        className={`px-6 py-3 text-lg font-semibold border-b-2 transition-colors duration-300 ${
            isActive
            ? 'border-cyan-400 text-cyan-400'
            : 'border-transparent text-gray-500 hover:text-gray-300'
        }`}
    >
        {label}
    </button>
);

const App: React.FC = () => {
  // Core State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [teaser, setTeaser] = useState<string>('');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [idealInvestorProfile, setIdealInvestorProfile] = useState<string>('');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [fcaEmail, setFcaEmail] = useState<string>('');
  const [diligenceQuestions, setDiligenceQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);
  const [isEmailPromptModalOpen, setIsEmailPromptModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'closedDeals' | 'materials' | 'database' | 'feedback' | 'transcript' | 'categorisation' | 'activeRaises'>('activeRaises');

  // Investor Database State
  const [investorDB, setInvestorDB] = useState<CsvInvestor[]>([]);
  const [investorDBFile, setInvestorDBFile] = useState<File | null>(null);
  const [isParsingDB, setIsParsingDB] = useState<boolean>(false);
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [investorMatchResults, setInvestorMatchResults] = useState<ScoredInvestor[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // Investor Feedback State
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackResult, setFeedbackResult] = useState<FeedbackAnalysisResult | null>(null);
  const [isAnalyzingFeedback, setIsAnalyzingFeedback] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Transcript Analyser State
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [transcriptAnalysisResult, setTranscriptAnalysisResult] = useState<TranscriptAnalysisResult | null>(null);
  const [isAnalyzingTranscript, setIsAnalyzingTranscript] = useState<boolean>(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  
  // Closed Deals State
  const [closedDeals, setClosedDeals] = useState<ClosedDeal[]>(initialDeals);
  const [isFindingDeals, setIsFindingDeals] = useState<boolean>(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [marketAppetite, setMarketAppetite] = useState<string | null>(initialMarketAppetite);
  const [filters, setFilters] = useState({ assetClass: 'All', geography: 'All', strategy: 'All' });
  
  // Strategy Categorisation State
  const [strategyText, setStrategyText] = useState<string>('');
  const [strategyResult, setStrategyResult] = useState<StrategyClassificationResult | null>(null);
  const [isCategorising, setIsCategorising] = useState<boolean>(false);
  const [categorisationError, setCategorisationError] = useState<string | null>(null);

  // Active Raises Predictor State
  const [predictorInputs, setPredictorInputs] = useState({
    fundSize: 500,
    vintageYear: 2020,
    netIRR: 18,
    dpi: 0.7,
    moic: 1.8,
    deploymentPct: 80,
  });
  const [predictionResult, setPredictionResult] = useState<{
      score: number;
      factors: { name: string; met: boolean; contribution: number; value: string; threshold: string; }[];
  } | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);


  useEffect(() => {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsParsing(true);

    // FIX: Explicitly type `file` as `File` to resolve multiple TypeScript errors
    // where properties of `file` were not accessible due to it being an 'unknown' type.
    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<{ file: File, text: string }>((resolve, reject) => {
        const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf'];
        const allowedExtensions = ['.txt', '.md', '.pdf'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            return reject(new Error(`Invalid file type for ${file.name}. Please upload .txt, .md, or .pdf files.`));
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            return reject(new Error(`${file.name} is too large. Please upload files smaller than 10MB.`));
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
                        interface TextItem { str: string; }
                        const pageText = textContent.items.map((item: TextItem) => item.str).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    resolve({ file, text: fullText });
                } catch (parseError) {
                    console.error('Error parsing PDF:', parseError);
                    reject(new Error(`Failed to parse ${file.name}. It might be corrupted or protected.`));
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (event) => {
                const text = event.target?.result as string;
                resolve({ file, text });
            };
            reader.readAsText(file);
        }
      });
    });

    Promise.all(filePromises).then(parsedFiles => {
        const newDocuments: Document[] = parsedFiles.map(pf => ({
            id: `${pf.file.name}-${pf.file.lastModified}`,
            file: pf.file,
            text: pf.text
        }));
        
        setDocuments(prev => {
            const existingIds = new Set(prev.map(doc => doc.id));
            const uniqueNewDocs = newDocuments.filter(doc => !existingIds.has(doc.id));
            return [...prev, ...uniqueNewDocs];
        });

    }).catch(err => {
        setError(err.message);
    }).finally(() => {
        setIsParsing(false);
        e.target.value = '';
    });
  };

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
                throw new Error("CSV must have a header row and at least one data row.");
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const data = lines.slice(1).map(line => {
                 // Basic CSV parsing, may need to be more robust for complex CSVs
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

    const combinedText = documents.map(doc => `--- START OF DOCUMENT: ${doc.file.name} ---\n\n${doc.text}\n\n--- END OF DOCUMENT: ${doc.file.name} ---`).join('\n\n');

    try {
      const [summaryRes, teaserRes, investorsRes, transactionsRes, emailRes, diligenceRes] = await Promise.all([
        generateSummary(combinedText),
        generateTeaser(combinedText),
        identifyInvestors(combinedText),
        identifyRecentTransactions(combinedText),
        generateFcaEmail(combinedText),
        generateDiligenceQuestions(combinedText)
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

  const handleAnalyzeFeedback = useCallback(async () => {
    if (!feedbackText.trim()) {
        setFeedbackError("Please paste the investor's feedback text before analyzing.");
        return;
    }
    
    setIsAnalyzingFeedback(true);
    setFeedbackError(null);
    setFeedbackResult(null);

    const combinedText = documents.map(doc => doc.text).join('\n\n');
    if (documents.length > 0 && !combinedText) {
        setFeedbackError("Document content is empty. Cannot check for answers.");
        setIsAnalyzingFeedback(false);
        return;
    }

    try {
        const result = await analyzeInvestorFeedback(feedbackText, combinedText);
        setFeedbackResult(result);
    } catch(err) {
        console.error('Error analyzing feedback:', err);
        setFeedbackError('An error occurred while analyzing the feedback. Please try again.');
    } finally {
        setIsAnalyzingFeedback(false);
    }
  }, [feedbackText, documents]);

  const handleAnalyzeTranscript = useCallback(async () => {
    if (!transcriptText.trim()) {
        setTranscriptError("Please paste the meeting transcript before analyzing.");
        return;
    }
    
    setIsAnalyzingTranscript(true);
    setTranscriptError(null);
    setTranscriptAnalysisResult(null);

    try {
        const result = await analyzeTranscript(transcriptText);
        setTranscriptAnalysisResult(result);
    } catch(err) {
        console.error('Error analyzing transcript:', err);
        setTranscriptError('An error occurred while analyzing the transcript. Please try again.');
    } finally {
        setIsAnalyzingTranscript(false);
    }
  }, [transcriptText]);

  const handleCategoriseStrategy = useCallback(async () => {
    if (!strategyText.trim()) {
        setCategorisationError("Please paste the fund strategy description before categorising.");
        return;
    }
    
    setIsCategorising(true);
    setCategorisationError(null);
    setStrategyResult(null);

    try {
        const result = await categoriseFundStrategy(strategyText);
        setStrategyResult(result);
    } catch(err) {
        console.error('Error categorising strategy:', err);
        setCategorisationError('An error occurred while categorising the strategy. Please try again.');
    } finally {
        setIsCategorising(false);
    }
  }, [strategyText]);

  const handlePredictRaise = useCallback(() => {
    setIsPredicting(true);
    setPredictionResult(null);

    // Simulate a short delay for UX, as if an AI is "thinking"
    setTimeout(() => {
        const currentYear = new Date().getFullYear();
        const fundAge = currentYear - predictorInputs.vintageYear;

        const factors = [
            {
                name: "Strong Performance (Net IRR > 15%)",
                met: predictorInputs.netIRR > 15,
                contribution: 30,
                value: `${predictorInputs.netIRR}%`,
                threshold: "> 15%",
            },
            {
                name: "Significant Distributions (DPI > 0.5x)",
                met: predictorInputs.dpi > 0.5,
                contribution: 20,
                value: `${predictorInputs.dpi.toFixed(2)}x`,
                threshold: "> 0.5x",
            },
            {
                name: "Value Creation (MOIC > 1.5x)",
                met: predictorInputs.moic > 1.5,
                contribution: 20,
                value: `${predictorInputs.moic.toFixed(2)}x`,
                threshold: "> 1.5x",
            },
            {
                name: "Sufficiently Deployed (> 60%)",
                met: predictorInputs.deploymentPct > 60,
                contribution: 15,
                value: `${predictorInputs.deploymentPct}%`,
                threshold: "> 60%",
            },
            {
                name: "Fundraising Window (Age 3-7 yrs)",
                met: fundAge >= 3 && fundAge <= 7,
                contribution: 15,
                value: `${fundAge} yrs`,
                threshold: "3-7 yrs",
            },
        ];
        
        const score = factors.reduce((acc, factor) => {
            return acc + (factor.met ? factor.contribution : 0);
        }, 0);

        setPredictionResult({ score, factors });
        setIsPredicting(false);
    }, 500);
  }, [predictorInputs]);


  const handleFindDeals = useCallback(async () => {
    setIsFindingDeals(true);
    setDealsError(null);
    try {
        const newDeals = await findClosedDeals();
        
        const currentDeals = closedDeals;
        const existingDealNames = new Set(currentDeals.map(deal => deal.dealName));
        const uniqueNewDeals = newDeals.filter(deal => !existingDealNames.has(deal.dealName));

        if (uniqueNewDeals.length > 0) {
            const combinedDeals = [...uniqueNewDeals, ...currentDeals];
            const cappedDeals = combinedDeals.slice(0, 40);

            setClosedDeals(cappedDeals);
            
            const analysis = await generateMarketAppetiteAnalysis(cappedDeals);
            setMarketAppetite(analysis);
        }

    } catch (err) {
        console.error('Error finding closed deals:', err);
        setDealsError('An error occurred while fetching recent deals. The AI may be experiencing high demand. Please try again later.');
    } finally {
        setIsFindingDeals(false);
    }
  }, [closedDeals]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handlePredictorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPredictorInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
  };


  const normalizeGeography = useCallback((geo: string) => {
    if (geo.includes('&')) {
      return geo.split('&').map(s => s.trim()).sort().join(' & ');
    }
    return geo;
  }, []);

  const filterOptions = useMemo(() => {
    // FIX: Explicitly type Set to <string> to ensure correct type inference for sort.
    const geographies = ['All', ...Array.from(new Set<string>(closedDeals.map(d => normalizeGeography(d.geographyFocus))))].sort((a,b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    // FIX: Explicitly type Set to <string> for type safety.
    const assetClasses = ['All', ...Array.from(new Set<string>(closedDeals.map(d => d.assetClass)))].sort();

    // FIX: Explicitly type Set to <string> to ensure correct type inference for forEach.
    const uniqueStrategies = [...new Set<string>(closedDeals.map(d => d.strategy))].sort();
    const strategies = {
        bySize: [] as string[],
        bySector: [] as string[],
        other: [] as string[]
    };
    
    uniqueStrategies.forEach(s => {
        const sLower = s.toLowerCase();
        if (sLower.includes('cap') || sLower.includes('buyout') || sLower.includes('venture') || sLower.includes('growth equity')) {
            strategies.bySize.push(s);
        } else if (sLower.includes('software') || sLower.includes('financial services') || sLower.includes('energy') || sLower.includes('infrastructure') || sLower.includes('real estate') || sLower.includes('tech') || sLower.includes('healthcare') || sLower.includes('consumer') || sLower.includes('services')) {
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
          'Private Equity': '#2dd4bf', // cyan-400
          'Private Credit': '#60a5fa', // blue-400
          'Other': '#a78bfa', // violet-400
      };

      return Object.entries(counts).map(([name, value]) => ({
          name,
          value,
          color: colors[name] || '#9ca3af' // gray-400
      }));
  }, [closedDeals]);
  
  const MemoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const TeaserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 8.188A9 9 0 1015.813 16.812" />
    </svg>
  );

  const InvestorsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
  
  const LinkedInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  );


   const TransactionsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );

  const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  
  const DiligenceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );

  const FileUploadIcon = () => (
     <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
  );

  const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7a8 8 0 0116 0" />
        <path d="M4 11c0 2.21 3.582 4 8 4s8-1.79 8-4" />
    </svg>
  );

  const FeedbackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );

  const TranscriptIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 8.5L10 10l-2 5h8l-2-5-1.5-1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V11" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5a2 2 0 100-4 2 2 0 000 4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8a7 7 0 0014 0" />
    </svg>
  );

  const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );

  const CategoriseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
  
  const PredictionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6M4 17l6-6 4 4 8-8" />
    </svg>
);


  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-sky-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  const getIntentCategoryTagColor = (category: string) => {
    switch(category) {
        case 'High Intent': return 'bg-green-900/80 text-green-300 border-green-700';
        case 'Medium Intent': return 'bg-sky-900/80 text-sky-300 border-sky-700';
        case 'Qualification/Questions': return 'bg-blue-900/80 text-blue-300 border-blue-700';
        case 'Mid Low Intent': return 'bg-yellow-900/80 text-yellow-300 border-yellow-700';
        case 'Low Intent': return 'bg-red-900/80 text-red-300 border-red-700';
        default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  }


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <Header />
      <main className="p-4 md:p-8 flex-grow">
        <div className="container mx-auto">
            <div className="mb-6 flex border-b border-gray-700 overflow-x-auto">
                 <TabButton
                    label="Recently Closed Funds"
                    isActive={activeTab === 'closedDeals'}
                    onClick={() => setActiveTab('closedDeals')}
                />
                <TabButton
                    label="Produce Investment Materials"
                    isActive={activeTab === 'materials'}
                    onClick={() => setActiveTab('materials')}
                />
                <TabButton
                    label="Investor Database"
                    isActive={activeTab === 'database'}
                    onClick={() => setActiveTab('database')}
                />
                <TabButton
                    label="Investor Feedback"
                    isActive={activeTab === 'feedback'}
                    onClick={() => setActiveTab('feedback')}
                />
                <TabButton
                    label="Transcript Analyser"
                    isActive={activeTab === 'transcript'}
                    onClick={() => setActiveTab('transcript')}
                />
                 <TabButton
                    label="Strategy Categorisation"
                    isActive={activeTab === 'categorisation'}
                    onClick={() => setActiveTab('categorisation')}
                />
                <TabButton
                    label="Active Raises"
                    isActive={activeTab === 'activeRaises'}
                    onClick={() => setActiveTab('activeRaises')}
                />
            </div>

            {activeTab === 'materials' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="w-full">
                            <label
                                htmlFor="file-upload"
                                className="flex flex-col items-center justify-center w-full p-4 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800/80 hover:border-cyan-500 transition-colors duration-300"
                            >
                                <div className="flex flex-col items-center justify-center text-center">
                                    {isParsing ? (
                                        <>
                                        <LoadingSpinner />
                                        <p className="mt-2 text-sm text-gray-300">Parsing document(s)...</p>
                                        </>
                                    ) : (
                                        <>
                                        <FileUploadIcon />
                                        <p className="mb-1 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500">Add one or more documents (PDF, TXT, MD)</p>
                                        </>
                                    )}
                                </div>
                                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" disabled={isParsing} multiple />
                            </label>
                        </div>

                        {documents.length > 0 && (
                            <div>
                                <label className="text-lg font-semibold text-cyan-400 mb-2 block">
                                    Active Documents
                                </label>
                                <ul className="space-y-2">
                                    {documents.map(doc => (
                                        <li key={doc.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-200 truncate">{doc.file.name}</p>
                                                <p className="text-xs text-gray-400">({(doc.file.size / 1024).toFixed(2)} KB)</p>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveDocument(doc.id)} 
                                                className="ml-4 text-gray-500 hover:text-red-400 font-bold text-xl"
                                                aria-label={`Remove ${doc.file.name}`}
                                            >
                                                &times;
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        <div className="sticky bottom-0 py-4 bg-gray-900/80 backdrop-blur-sm lg:static lg:bg-transparent lg:p-0">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || isParsing || documents.length === 0}
                            className="w-full text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/50 flex items-center justify-center"
                            >
                            {isLoading ? (
                                <>
                                <LoadingSpinner /> Generating...
                                </>
                            ) : "Generate Investment Materials"}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4">{error}</div>}

                        {isLoading ? (
                        <div className="flex justify-center items-center h-full min-h-[400px]">
                            <div className="text-center">
                            <LoadingSpinner />
                            <p className="mt-4 text-lg text-cyan-300">AI is analyzing your document(s)... this may take a moment.</p>
                            </div>
                        </div>
                        ) : (
                        <div className="space-y-6">
                            {!error && (summary || teaser || investors.length > 0 || recentTransactions.length > 0 || fcaEmail || diligenceQuestions.length > 0) ? (
                            <>
                                {summary && (
                                <Card 
                                    title="Investment Summary" 
                                    icon={<MemoIcon />}
                                    actions={<CopyButton textToCopy={summary} />}
                                >
                                    <div 
                                    className="markdown-content"
                                    dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(summary) : summary }} 
                                    />
                                </Card>
                                )}
                                {teaser && (
                                <Card 
                                    title="Blind Investment Teaser" 
                                    icon={<TeaserIcon />}
                                    actions={<CopyButton textToCopy={teaser} />}
                                >
                                    <div 
                                    className="markdown-content"
                                    dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(teaser) : teaser }} 
                                    />
                                </Card>
                                )}
                                {diligenceQuestions.length > 0 && (
                                <Card title="Due Diligence Report" icon={<DiligenceIcon />}>
                                    <ol className="list-decimal list-inside space-y-4">
                                        {diligenceQuestions.map((question, index) => (
                                        <li key={index} className="text-gray-300 bg-gray-800/50 p-3 rounded-md border-l-4 border-amber-500">
                                            {question}
                                        </li>
                                        ))}
                                    </ol>
                                </Card>
                                )}
                                {investors.length > 0 && (
                                <Card title="Potential Investors" icon={<InvestorsIcon />}>
                                    {idealInvestorProfile && (
                                        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-lg text-cyan-300">Ideal Investor Profile</h4>
                                                <button onClick={() => setIsPromptModalOpen(true)} className="text-xs text-cyan-400 hover:text-cyan-300 underline">Show Prompt</button>
                                            </div>
                                            <p className="text-gray-300 italic">{idealInvestorProfile}</p>
                                        </div>
                                    )}
                                    <ul className="space-y-4">
                                    {investors.map((investor, index) => (
                                        <li key={index} className="bg-gray-800 p-4 rounded-md border-l-4 border-cyan-500">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-lg text-cyan-300 mb-1">{investor.name}</h4>
                                                {investor.companyName && investor.companyUrl ? (
                                                    <a href={investor.companyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                                        {investor.companyName}
                                                    </a>
                                                ) : investor.companyName ? (
                                                    <p className="text-sm text-gray-400">{investor.companyName}</p>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                {investor.linkedinUrl && (
                                                    <a href={investor.linkedinUrl} target="_blank" rel="noopener noreferrer" title="View LinkedIn Profile">
                                                        <LinkedInIcon />
                                                    </a>
                                                )}
                                                <span className="text-sm font-bold text-cyan-200 bg-cyan-900/50 px-2 py-1 rounded-full">{investor.weighting}% Match</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-1.5 my-3">
                                            <div className="bg-cyan-500 h-1.5 rounded-full" style={{width: `${investor.weighting}%`}}></div>
                                        </div>
                                        <p><strong className="font-semibold text-gray-400">Focus:</strong> {investor.focus}</p>
                                        <p><strong className="font-semibold text-gray-400">Reason:</strong> {investor.reason}</p>
                                        </li>
                                    ))}
                                    </ul>
                                </Card>
                                )}
                                {recentTransactions.length > 0 && (
                                <Card title="Recent Transactions" icon={<TransactionsIcon />}>
                                    <ul className="space-y-6">
                                    {recentTransactions.map((transaction, index) => (
                                        <li key={index} className="bg-gray-800 p-4 rounded-md border-l-4 border-teal-500">
                                        <h4 className="font-bold text-lg text-teal-300 mb-2">{transaction.name}</h4>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-3">
                                            <div><strong className="font-semibold text-gray-400">Geography:</strong> {transaction.geography}</div>
                                            <div><strong className="font-semibold text-gray-400">Asset Class:</strong> {transaction.assetClass}</div>
                                            <div><strong className="font-semibold text-gray-400">Deal Size:</strong> {transaction.dealSize}</div>
                                        </div>
                                        <p className="text-gray-300">{transaction.summary}</p>
                                        </li>
                                    ))}
                                    </ul>
                                </Card>
                                )}
                                {fcaEmail && (
                                    <Card
                                        title="FCA Compliant Outreach Email"
                                        icon={<EmailIcon />}
                                        actions={
                                            <div className="flex items-center space-x-4">
                                                <button 
                                                onClick={() => setIsEmailPromptModalOpen(true)} 
                                                className="text-sm text-cyan-400 hover:text-cyan-300 underline transition-colors"
                                                >
                                                Show Prompt
                                                </button>
                                                <CopyButton textToCopy={fcaEmail} />
                                            </div>
                                        }
                                    >
                                        <pre className="whitespace-pre-wrap font-sans text-gray-300 bg-gray-900/50 p-4 rounded-md border border-gray-700">
                                            {fcaEmail}
                                        </pre>
                                    </Card>
                                )}
                            </>
                            ) : (
                            !error && <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-800/50 rounded-lg p-10 border-2 border-dashed border-gray-700">
                                    <h2 className="text-2xl font-bold text-gray-400">Your AI-Generated Materials Will Appear Here</h2>
                                    <p className="mt-2 text-gray-500">
                                        Upload one or more documents and click "Generate" to see the results.
                                    </p>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'database' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="w-full">
                           <label
                                htmlFor="db-upload"
                                className="flex flex-col items-center justify-center w-full p-4 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800/80 hover:border-cyan-500 transition-colors duration-300"
                            >
                                <div className="flex flex-col items-center justify-center text-center">
                                    {isParsingDB ? (
                                        <>
                                        <LoadingSpinner />
                                        <p className="mt-2 text-sm text-gray-300">Parsing CSV...</p>
                                        </>
                                    ) : (
                                        <>
                                        <FileUploadIcon />
                                        <p className="mb-1 text-sm text-gray-400"><span className="font-semibold">Upload Investor Database</span></p>
                                        <p className="text-xs text-gray-500">Upload a CSV file with your investor contacts</p>
                                        </>
                                    )}
                                </div>
                                <input id="db-upload" type="file" className="hidden" onChange={handleInvestorDBFileChange} accept=".csv,text/csv" disabled={isParsingDB} />
                            </label>
                        </div>
                         {investorDBFile && (
                            <div>
                                <label className="text-lg font-semibold text-cyan-400 mb-2 block">
                                    Active Database
                                </label>
                                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-200 truncate">{investorDBFile.name}</p>
                                        <p className="text-xs text-gray-400">{investorDB.length} records found</p>
                                    </div>
                                    <button 
                                        onClick={() => { setInvestorDBFile(null); setInvestorDB([]); setInvestorMatchResults([]); }}
                                        className="ml-4 text-gray-500 hover:text-red-400 font-bold text-xl"
                                        aria-label={`Remove ${investorDBFile.name}`}
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="sticky bottom-0 py-4 bg-gray-900/80 backdrop-blur-sm lg:static lg:bg-transparent lg:p-0">
                            <button
                                onClick={handleScoreInvestors}
                                disabled={isScoring || !idealInvestorProfile || investorDB.length === 0}
                                className="w-full text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/50 flex items-center justify-center"
                                title={!idealInvestorProfile ? "Generate Investment Materials first to create an Ideal Investor Profile." : ""}
                            >
                            {isScoring ? (
                                <>
                                <LoadingSpinner /> Scoring...
                                </>
                            ) : "Score Investors vs. Ideal Profile"}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                       {dbError && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4">{dbError}</div>}
                       {isScoring ? (
                            <div className="flex justify-center items-center h-full min-h-[400px]">
                                <div className="text-center">
                                <LoadingSpinner />
                                <p className="mt-4 text-lg text-cyan-300">AI is scoring your investor list... this may take a moment.</p>
                                </div>
                            </div>
                        ) : (
                           <div className="space-y-6">
                            {investorMatchResults.length > 0 ? (
                                <Card title="Investor Match Results" icon={<DatabaseIcon />}>
                                    <ul className="space-y-4">
                                        {investorMatchResults.map((investor, index) => (
                                            <li key={index} className="bg-gray-800 p-4 rounded-md border-l-4 border-cyan-500">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-lg text-cyan-300 mb-1">{investor.name}</h4>
                                                         {investor.companyName && investor.companyUrl ? (
                                                            <a href={investor.companyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                                                {investor.companyName}
                                                            </a>
                                                        ) : investor.companyName ? (
                                                            <p className="text-sm text-gray-400">{investor.companyName}</p>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        {investor.linkedinUrl && (
                                                            <a href={investor.linkedinUrl} target="_blank" rel="noopener noreferrer" title="View LinkedIn Profile">
                                                                <LinkedInIcon />
                                                            </a>
                                                        )}
                                                        <span className="text-sm font-bold text-cyan-200 bg-cyan-900/50 px-2 py-1 rounded-full">{investor.matchScore}% Match</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-1.5 my-3">
                                                    <div className="bg-cyan-500 h-1.5 rounded-full" style={{width: `${investor.matchScore}%`}}></div>
                                                </div>
                                                <p><strong className="font-semibold text-gray-400">Reason:</strong> {investor.reason}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            ) : (
                                 <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-800/50 rounded-lg p-10 border-2 border-dashed border-gray-700">
                                    <h2 className="text-2xl font-bold text-gray-400">Investor Match Scores Will Appear Here</h2>
                                    <p className="mt-2 text-gray-500">
                                        1. Go to 'Produce Investment Materials' to generate an Ideal Investor Profile.
                                        <br />
                                        2. Upload your investor database CSV here.
                                        <br />
                                        3. Click "Score Investors" to see the results.
                                    </p>
                                </div>
                            )}
                           </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'feedback' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <Card title="Analyze Investor Reply" icon={<FeedbackIcon />}>
                           <p className="text-sm text-gray-400 mb-4">Paste the full text of an investor's email reply to grade their interest, analyze their questions, and get a suggested next step.</p>
                           <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Paste investor email text here..."
                                className="w-full h-60 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-300"
                           ></textarea>
                           <button
                                onClick={handleAnalyzeFeedback}
                                disabled={isAnalyzingFeedback}
                                className="w-full mt-4 text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/50 flex items-center justify-center"
                           >
                                {isAnalyzingFeedback ? <><LoadingSpinner /> Analyzing...</> : "Analyze Feedback"}
                           </button>
                        </Card>
                    </div>
                    <div className="lg:col-span-7">
                        {feedbackError && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4">{feedbackError}</div>}
                        {isAnalyzingFeedback ? (
                            <div className="flex justify-center items-center h-full min-h-[400px]">
                                <div className="text-center">
                                <LoadingSpinner />
                                <p className="mt-4 text-lg text-cyan-300">AI is analyzing the feedback...</p>
                                </div>
                            </div>
                        ) : feedbackResult ? (
                           <Card title="Feedback Analysis" icon={<FeedbackIcon />}>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                   <div className="bg-gray-900/50 p-4 rounded-lg text-center border border-gray-700">
                                       <p className="text-sm text-gray-400">Interest Score</p>
                                       <p className="text-4xl font-bold text-cyan-400">{feedbackResult.interestScore} <span className="text-xl text-gray-500">/ 100</span></p>
                                       <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                                            <div className={`${getScoreColor(feedbackResult.interestScore)} h-2.5 rounded-full`} style={{width: `${feedbackResult.interestScore}%`}}></div>
                                        </div>
                                   </div>
                                   <div className="bg-gray-900/50 p-4 rounded-lg text-center border border-gray-700">
                                       <p className="text-sm text-gray-400">Intent Category</p>
                                       <p className={`text-xl font-bold mt-2 inline-block px-3 py-1 border rounded-full ${getIntentCategoryTagColor(feedbackResult.intentCategory)}`}>{feedbackResult.intentCategory}</p>
                                   </div>
                               </div>
                               <div className="space-y-4">
                                   <div>
                                       <h4 className="font-semibold text-gray-300">AI Reasoning:</h4>
                                       <p className="text-gray-400 italic">"{feedbackResult.reasoning}"</p>
                                   </div>
                                    <div>
                                       <h4 className="font-semibold text-gray-300">Suggested Next Step:</h4>
                                       <p className="text-cyan-400 font-bold text-lg">{feedbackResult.nextStep}</p>
                                   </div>
                               </div>

                                {feedbackResult.questionsAndAnswers && feedbackResult.questionsAndAnswers.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-gray-700">
                                        <h4 className="text-lg font-bold text-cyan-300 mb-4">Question Analysis</h4>
                                        <div className="space-y-4">
                                            {feedbackResult.questionsAndAnswers.map((qa, index) => (
                                                <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                                    <p className="font-semibold text-gray-300 mb-2">Q: "{qa.question}"</p>
                                                    {qa.answer.startsWith("ACTION_REQUIRED") ? (
                                                        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-3 rounded-md">
                                                            <p className="font-bold">Action Required</p>
                                                            <p className="text-sm">No answer was found in the provided investment materials. You will need to answer this question manually.</p>
                                                        </div>
                                                    ) : (
                                                         <div className="bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-md">
                                                            <p className="font-bold">Suggested Answer (from documents):</p>
                                                            <p className="text-sm">{qa.answer}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                           </Card>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-800/50 rounded-lg p-10 border-2 border-dashed border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-400">Feedback Analysis Will Appear Here</h2>
                                <p className="mt-2 text-gray-500">
                                    Paste an investor's email reply and click "Analyze Feedback".
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'transcript' && (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <Card title="Analyze Meeting Transcript" icon={<TranscriptIcon />}>
                           <p className="text-sm text-gray-400 mb-4">Paste a meeting transcript to get a debrief, performance coaching, and structured data output.</p>
                           <textarea
                                value={transcriptText}
                                onChange={(e) => setTranscriptText(e.target.value)}
                                placeholder="Paste meeting transcript here..."
                                className="w-full h-96 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-300"
                           ></textarea>
                           <button
                                onClick={handleAnalyzeTranscript}
                                disabled={isAnalyzingTranscript}
                                className="w-full mt-4 text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/50 flex items-center justify-center"
                           >
                                {isAnalyzingTranscript ? <><LoadingSpinner /> Analyzing...</> : "Analyze Transcript"}
                           </button>
                        </Card>
                    </div>
                    <div className="lg:col-span-7">
                        {transcriptError && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4">{transcriptError}</div>}
                        {isAnalyzingTranscript ? (
                             <div className="flex justify-center items-center h-full min-h-[400px]">
                                <div className="text-center">
                                <LoadingSpinner />
                                <p className="mt-4 text-lg text-cyan-300">AI is analyzing the transcript...</p>
                                </div>
                            </div>
                        ) : transcriptAnalysisResult ? (
                           <Card title="Transcript Analysis" icon={<TranscriptIcon />}>
                               <div className="space-y-6">
                                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                         <h4 className="text-lg font-bold text-cyan-300 mb-2">Investor Details</h4>
                                         <table className="w-full text-sm text-left">
                                            <tbody className="divide-y divide-gray-700">
                                                <tr className="divide-x divide-gray-700">
                                                    <td className="font-semibold p-2 w-1/4">Name</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.firstName} {transcriptAnalysisResult.meetingData.lastName}</td>
                                                    <td className="font-semibold p-2 w-1/4">Company</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.companyName}</td>
                                                </tr>
                                                 <tr className="divide-x divide-gray-700">
                                                    <td className="font-semibold p-2">Fund Name</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.fundName}</td>
                                                    <td className="font-semibold p-2">Asset Class</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.assetClass}</td>
                                                </tr>
                                                <tr className="divide-x divide-gray-700">
                                                    <td className="font-semibold p-2">Geography</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.geography}</td>
                                                    <td className="font-semibold p-2">Sector Focus</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.sectorFocus}</td>
                                                </tr>
                                                 <tr className="divide-x divide-gray-700">
                                                    <td className="font-semibold p-2">Location</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.location}</td>
                                                    <td className="font-semibold p-2">Ticket Size ($M)</td>
                                                    <td className="p-2">{transcriptAnalysisResult.meetingData.ticketSize}</td>
                                                </tr>
                                            </tbody>
                                         </table>
                                    </div>
                                     <div>
                                        <h4 className="text-lg font-bold text-cyan-300 mb-2">Meeting Summary</h4>
                                        <p className="text-gray-300">{transcriptAnalysisResult.meetingSummary}</p>
                                     </div>
                                      <div>
                                        <h4 className="text-lg font-bold text-cyan-300 mb-2">Next Steps</h4>
                                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(transcriptAnalysisResult.nextSteps) : transcriptAnalysisResult.nextSteps }} />
                                      </div>
                                    <div className="pt-6 border-t border-gray-700">
                                        <h4 className="text-lg font-bold text-cyan-300 mb-2">Performance Coaching</h4>
                                        <div className="bg-gray-900/50 p-4 rounded-lg text-center border border-gray-700 mb-4">
                                            <p className="text-sm text-gray-400">Overall Performance Score</p>
                                            <p className="text-4xl font-bold text-cyan-400">{transcriptAnalysisResult.overallScore} <span className="text-xl text-gray-500">/ 100</span></p>
                                            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                                                    <div className={`${getScoreColor(transcriptAnalysisResult.overallScore)} h-2.5 rounded-full`} style={{width: `${transcriptAnalysisResult.overallScore}%`}}></div>
                                                </div>
                                        </div>
                                        <p className="text-gray-300 italic mb-4">{transcriptAnalysisResult.summary}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-green-900/20 p-4 rounded-lg border border-green-700">
                                                <h5 className="font-bold text-green-300 mb-2">Key Strengths</h5>
                                                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(transcriptAnalysisResult.strengths) : transcriptAnalysisResult.strengths }} />
                                            </div>
                                            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-700">
                                                <h5 className="font-bold text-yellow-300 mb-2">Areas for Improvement</h5>
                                                 <div className="markdown-content" dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(transcriptAnalysisResult.areasForImprovement) : transcriptAnalysisResult.areasForImprovement }} />
                                            </div>
                                        </div>
                                         <div className="mt-4">
                                            <h5 className="font-bold text-cyan-300 mb-2">Actionable Suggestions</h5>
                                             <div className="markdown-content" dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(transcriptAnalysisResult.actionableSuggestions) : transcriptAnalysisResult.actionableSuggestions }} />
                                         </div>
                                    </div>
                               </div>
                           </Card>
                        ) : (
                             <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-800/50 rounded-lg p-10 border-2 border-dashed border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-400">Transcript Analysis Will Appear Here</h2>
                                <p className="mt-2 text-gray-500">
                                    Paste a meeting transcript and click "Analyze Transcript".
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'closedDeals' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 xl:col-span-3">
                        <div className="sticky top-24 flex flex-col gap-6">
                            <button
                                onClick={handleFindDeals}
                                disabled={isFindingDeals}
                                className="w-full text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/50 flex items-center justify-center"
                            >
                                {isFindingDeals ? <><LoadingSpinner /> Searching for Recent Fund Closes...</> : "Refresh Data"}
                            </button>
                            <Card title="Market Appetite" icon={<ChartIcon />}>
                                {marketAppetite ? (
                                    <>
                                        <div className="mb-4">
                                          <PieChart data={pieChartData} />
                                        </div>
                                        <div 
                                        className="markdown-content text-sm"
                                        dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(marketAppetite) : marketAppetite }} 
                                        />
                                    </>
                                ) : (
                                    <p className="text-gray-500">Click "Find Recent Deals" to generate an analysis.</p>
                                )}
                                
                            </Card>
                             <Card title="Filters" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="assetClass" className="block text-sm font-medium text-gray-300 mb-1">Asset Class</label>
                                        <select name="assetClass" id="assetClass" value={filters.assetClass} onChange={handleFilterChange} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-white">
                                            {filterOptions.assetClasses.map(ac => <option key={ac} value={ac}>{ac}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="geography" className="block text-sm font-medium text-gray-300 mb-1">Geography</label>
                                        <select name="geography" id="geography" value={filters.geography} onChange={handleFilterChange} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-white">
                                            {filterOptions.geographies.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label htmlFor="strategy" className="block text-sm font-medium text-gray-300 mb-1">Strategy</label>
                                        <select name="strategy" id="strategy" value={filters.strategy} onChange={handleFilterChange} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-white">
                                            <option value="All">All Strategies</option>
                                            {filterOptions.strategies.bySize.length > 0 && (
                                                <optgroup label="By Asset Size">
                                                    {filterOptions.strategies.bySize.map(s => <option key={s} value={s}>{s}</option>)}
                                                </optgroup>
                                            )}
                                            {filterOptions.strategies.bySector.length > 0 && (
                                                <optgroup label="By Sector Focus">
                                                    {filterOptions.strategies.bySector.map(s => <option key={s} value={s}>{s}</option>)}
                                                </optgroup>
                                            )}
                                            {filterOptions.strategies.other.length > 0 && (
                                                <optgroup label="Other Strategies">
                                                    {filterOptions.strategies.other.map(s => <option key={s} value={s}>{s}</option>)}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                    <div className="lg:col-span-8 xl:col-span-9">
                        {dealsError && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4">{dealsError}</div>}
                        <div className="space-y-6">
                            {filteredDeals.length > 0 ? (
                                filteredDeals.map((deal, index) => (
                                    <div key={`${deal.dealName}-${index}`} className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700 transition-transform duration-300 hover:scale-[1.02] hover:border-cyan-600">
                                        <div className="p-5">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xl font-bold text-cyan-400 mb-2">{deal.dealName}</h3>
                                                <span className="text-sm font-bold text-gray-300 bg-gray-700 px-3 py-1 rounded-full whitespace-nowrap">{deal.fundSize}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3"><span className="font-semibold">Placement Agent:</span> {deal.placementAgent}</p>
                                            <p className="text-gray-300 mb-4">{deal.summary}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                                <span className="bg-cyan-900/50 text-cyan-200 px-2 py-1 rounded-full">{deal.assetClass}</span>
                                                <span className="bg-violet-900/50 text-violet-200 px-2 py-1 rounded-full">{deal.strategy}</span>
                                                <span className="bg-amber-900/50 text-amber-200 px-2 py-1 rounded-full">{deal.geographyFocus}</span>
                                                <span className="bg-pink-900/50 text-pink-200 px-2 py-1 rounded-full">{deal.sectorFocus}</span>
                                                <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-cyan-400 hover:text-cyan-300 hover:underline font-semibold">
                                                    Source &rarr;
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-800/50 rounded-lg p-10 border-2 border-dashed border-gray-700">
                                    <h2 className="text-2xl font-bold text-gray-400">No Deals Found</h2>
                                    <p className="mt-2 text-gray-500">
                                        Try adjusting your filters or click "Refresh Data" to find the latest deals.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'categorisation' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 flex flex-col gap-6">
                         <Card title="Categorise Fund Strategy" icon={<CategoriseIcon />}>
                           <p className="text-sm text-gray-400 mb-4">Paste a fund's strategy description to standardize its classification based on your internal lexicon.</p>
                           <textarea
                                value={strategyText}
                                onChange={(e) => setStrategyText(e.target.value)}
                                placeholder="e.g., A long/short equity vehicle targeting deep value discrepancies in North American mid-cap technology stocks..."
                                className="w-full h-60 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-300"
                           ></textarea>
                           <button
                                onClick={handleCategoriseStrategy}
                                disabled={isCategorising}
                                className="w-full mt-4 text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/50 flex items-center justify-center"
                           >
                                {isCategorising ? <><LoadingSpinner /> Categorising...</> : "Categorise Strategy"}
                           </button>
                        </Card>
                    </div>
                     <div className="lg:col-span-7">
                        {categorisationError && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4">{categorisationError}</div>}
                         {isCategorising ? (
                             <div className="flex justify-center items-center h-full min-h-[400px]">
                                <div className="text-center">
                                <LoadingSpinner />
                                <p className="mt-4 text-lg text-cyan-300">AI is classifying the strategy...</p>
                                </div>
                            </div>
                        ) : strategyResult ? (
                           <Card title="Classification Result" icon={<CategoriseIcon />}>
                               <table className="w-full">
                                   <thead>
                                       <tr className="border-b border-gray-600">
                                           <th className="p-3 text-left text-sm font-semibold text-gray-400 uppercase w-1/2">Fund Self-Designation</th>
                                           <th className="p-3 text-left text-sm font-semibold text-gray-400 uppercase w-1/2">Internal Classification</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       <tr className="bg-gray-800/50">
                                           <td className="p-4 border-r border-gray-700 align-top">
                                               <p className="text-gray-300">{strategyText}</p>
                                           </td>
                                           <td className="p-4 align-top">
                                                <p className="font-mono text-lg text-cyan-300">
                                                    {strategyResult.primaryStrategy}
                                                    {strategyResult.styleFocus.length > 0 && (
                                                        <span className="text-amber-400"> ({strategyResult.styleFocus.join(', ')})</span>
                                                    )}
                                                     {strategyResult.optionalTag && (
                                                        <span className="text-violet-400"> [{strategyResult.optionalTag}]</span>
                                                    )}
                                                </p>
                                           </td>
                                       </tr>
                                   </tbody>
                               </table>
                           </Card>
                        ) : (
                             <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-800/50 rounded-lg p-10 border-2 border-dashed border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-400">Strategy Classification Will Appear Here</h2>
                                <p className="mt-2 text-gray-500">
                                    Paste a fund strategy description and click "Categorise Strategy".
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'activeRaises' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 flex flex-col gap-6">
                         <Card title="Fundraising Likelihood Predictor" icon={<PredictionIcon />}>
                           <p className="text-sm text-gray-400 mb-6">Input a fund's key performance and status metrics to predict the likelihood it is currently or will soon be fundraising. Based on a heuristic model of typical fundraising triggers.</p>
                           <div className="space-y-6">
                                <div>
                                    <label htmlFor="fundSize" className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                                        <span>Fund Size ($MM)</span>
                                        <span className="text-cyan-400 font-mono">${predictorInputs.fundSize.toLocaleString()}M</span>
                                    </label>
                                    <input type="range" id="fundSize" name="fundSize" min="10" max="5000" step="10" value={predictorInputs.fundSize} onChange={handlePredictorInputChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-cyan"/>
                                </div>
                                 <div>
                                    <label htmlFor="vintageYear" className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                                        <span>Vintage Year</span>
                                        <span className="text-cyan-400 font-mono">{predictorInputs.vintageYear}</span>
                                    </label>
                                    <input type="range" id="vintageYear" name="vintageYear" min="2005" max={new Date().getFullYear()} step="1" value={predictorInputs.vintageYear} onChange={handlePredictorInputChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-cyan"/>
                                </div>
                                 <div>
                                    <label htmlFor="netIRR" className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                                        <span>Net IRR (%)</span>
                                        <span className="text-cyan-400 font-mono">{predictorInputs.netIRR}%</span>
                                    </label>
                                    <input type="range" id="netIRR" name="netIRR" min="-20" max="50" step="1" value={predictorInputs.netIRR} onChange={handlePredictorInputChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-cyan"/>
                                </div>
                                <div>
                                    <label htmlFor="dpi" className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                                        <span>DPI</span>
                                        <span className="text-cyan-400 font-mono">{predictorInputs.dpi.toFixed(2)}x</span>
                                    </label>
                                    <input type="range" id="dpi" name="dpi" min="0" max="3" step="0.05" value={predictorInputs.dpi} onChange={handlePredictorInputChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-cyan"/>
                                </div>
                                <div>
                                    <label htmlFor="moic" className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                                        <span>MOIC</span>
                                        <span className="text-cyan-400 font-mono">{predictorInputs.moic.toFixed(2)}x</span>
                                    </label>
                                    <input type="range" id="moic" name="moic" min="0" max="5" step="0.1" value={predictorInputs.moic} onChange={handlePredictorInputChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-cyan"/>
                                </div>
                                <div>
                                    <label htmlFor="deploymentPct" className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                                        <span>Deployment (%)</span>
                                        <span className="text-cyan-400 font-mono">{predictorInputs.deploymentPct}%</span>
                                    </label>
                                    <input type="range" id="deploymentPct" name="deploymentPct" min="0" max="100" step="1" value={predictorInputs.deploymentPct} onChange={handlePredictorInputChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-cyan"/>
                                </div>
                           </div>
                           <button
                                onClick={handlePredictRaise}
                                disabled={isPredicting}
                                className="w-full mt-8 text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/50 flex items-center justify-center"
                           >
                                {isPredicting ? <><LoadingSpinner /> Predicting...</> : "Predict Likelihood"}
                           </button>
                        </Card>
                    </div>
                     <div className="lg:col-span-7">
                         {isPredicting ? (
                             <div className="flex justify-center items-center h-full min-h-[400px]">
                                <div className="text-center">
                                <LoadingSpinner />
                                <p className="mt-4 text-lg text-cyan-300">Analyzing fund metrics...</p>
                                </div>
                            </div>
                        ) : predictionResult ? (
                           <Card title="Prediction Result" icon={<PredictionIcon />}>
                               <div className="text-center mb-6">
                                    <p className="text-sm text-gray-400 mb-2">Fundraising Propensity Score</p>
                                    <p className={`text-6xl font-bold ${getScoreColor(predictionResult.score).replace('bg-','text-')}`}>{predictionResult.score}</p>
                                    <div className="w-full bg-gray-700 rounded-full h-4 mt-3">
                                        <div className={`${getScoreColor(predictionResult.score)} h-4 rounded-full transition-all duration-500`} style={{width: `${predictionResult.score}%`}}></div>
                                    </div>
                                    <p className="mt-3 text-2xl font-semibold text-gray-200">
                                        {predictionResult.score >= 50 ? "High Likelihood of Fundraising" : "Low Likelihood of Fundraising"}
                                    </p>
                               </div>
                               <div>
                                   <h4 className="text-lg font-bold text-cyan-300 mb-4 border-b border-gray-700 pb-2">Key Predictive Factors</h4>
                                   <ul className="space-y-3">
                                       {predictionResult.factors.map(factor => (
                                           <li key={factor.name} className={`flex items-start p-3 rounded-lg border-l-4 ${factor.met ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
                                               {factor.met ? 
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> :
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                               }
                                               <div className="flex-grow">
                                                   <p className="font-semibold text-gray-200">{factor.name}</p>
                                                   <p className="text-sm text-gray-400">
                                                       Status: <span className="font-mono">{factor.value}</span> (Threshold: {factor.threshold})
                                                   </p>
                                               </div>
                                               <div className={`text-lg font-bold ml-4 ${factor.met ? 'text-green-400' : 'text-gray-500'}`}>
                                                   {factor.met ? `+${factor.contribution}`: '+0'} pts
                                               </div>
                                           </li>
                                       ))}
                                   </ul>
                               </div>
                           </Card>
                        ) : (
                             <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-800/50 rounded-lg p-10 border-2 border-dashed border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-400">Prediction Will Appear Here</h2>
                                <p className="mt-2 text-gray-500">
                                    Adjust the fund metrics on the left and click "Predict Likelihood" to see the results.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}


        </div>
      </main>
      <footer className="text-center p-4 text-xs text-gray-600 border-t border-gray-800">
          This is a Capital Raising AI tool created by Alexander Tilmouth
      </footer>
      <Modal 
        isOpen={isPromptModalOpen} 
        onClose={() => setIsPromptModalOpen(false)}
        title="AI Prompt: Ideal Investor Profile"
      >
        <pre className="bg-gray-900 text-gray-300 p-4 rounded-md whitespace-pre-wrap font-mono text-sm">
            {INVESTOR_ANALYSIS_PROMPT}
        </pre>
      </Modal>
      <Modal 
        isOpen={isEmailPromptModalOpen} 
        onClose={() => setIsEmailPromptModalOpen(false)}
        title="AI Prompt: FCA Compliant Outreach Email"
      >
        <pre className="bg-gray-900 text-gray-300 p-4 rounded-md whitespace-pre-wrap font-mono text-sm">
            {FCA_EMAIL_PROMPT.split('### DOCUMENT:')[0]}
        </pre>
      </Modal>
    </div>
  );
};

export default App;
