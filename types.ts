
export interface Document {
  id: string;
  file: File;
  text: string;
}

export interface Investor {
  name: string;
  focus: string;
  reason: string;
  weighting: number;
  companyName: string;
  companyUrl: string;
  linkedinUrl: string;
}

export interface InvestorAnalysisResult {
  investors: Investor[];
  idealProfile: string;
}

export interface Transaction {
  name: string;
  geography: string;
  assetClass: string;
  dealSize: string;
  summary: string;
}

export interface CsvInvestor {
  [key: string]: string; 
}

export interface ScoredInvestor {
  name: string;
  matchScore: number;
  reason: string;
  companyName: string;
  companyUrl: string;
  linkedinUrl: string;
}

export interface QuestionAndAnswer {
  question: string;
  answer: string; 
}


export interface FeedbackAnalysisResult {
  interestScore: number;
  intentCategory: string;
  reasoning: string;
  nextStep: string;
  questionsAndAnswers: QuestionAndAnswer[];
}

export interface MeetingData {
  firstName: string;
  lastName: string;
  companyName: string;
  fundName: string;
  assetClass: string;
  geography: string;
  location: string;
  sectorFocus: string;
  ticketSize: string;
}


export interface TranscriptAnalysisResult {
  overallScore: number;
  summary: string;
  strengths: string;
  areasForImprovement: string;
  actionableSuggestions: string;
  meetingSummary: string;
  nextSteps: string;
  meetingData: MeetingData;
}

export interface ClosedDeal {
  dealName: string;
  placementAgent: string;
  fundSize: string;
  assetClass: 'Private Equity' | 'Private Credit' | 'Other';
  strategy: string;
  sectorFocus: string;
  geographyFocus: string;
  summary: string;
  sourceUrl: string;
}

export interface StrategyClassificationResult {
  primaryStrategy: string;
  styleFocus: string[];
  optionalTag: string;
}

export interface PbvMetrics {
  searchVolumeIndex: number;
  newsMentions: number;
  socialMediaEngagement: number;
  regulatoryActionCount: number;
  seniorProfilesCount: number;
  websiteTransparencyScore: number;
  fundLaunchCount3Y: number;
  peerFundSizeMM: number;
  industryRankingPresence: number;
}

export interface PbvFirmData {
  firmName: string;
  metrics: PbvMetrics;
  rationales?: { [K in keyof PbvMetrics]?: string };
}

export interface PbvDetailedScore {
    name: string;
    score: number;
    rationale: string;
}

export interface PbvResult {
    firmName: string;
    pbvScore: number;
    maiScore: number;
    pciScore: number;
    osiScore: number;
    detailedScores: PbvDetailedScore[];
}
