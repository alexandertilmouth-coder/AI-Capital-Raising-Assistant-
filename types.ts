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

// An investor parsed from the user's CSV
export interface CsvInvestor {
  [key: string]: string; // Flexible for different CSV headers
}

// The result of scoring one investor against the ideal profile
export interface ScoredInvestor {
  name: string;
  matchScore: number;
  reason: string;
  companyName: string;
  companyUrl: string;
  linkedinUrl: string;
}

// A question from an investor and its corresponding answer
export interface QuestionAndAnswer {
  question: string;
  answer: string; // Contains the answer or an "ACTION_REQUIRED" flag
}


// The result of analyzing an investor's email feedback
export interface FeedbackAnalysisResult {
  interestScore: number;
  intentCategory: string;
  reasoning: string;
  nextStep: string;
  questionsAndAnswers: QuestionAndAnswer[];
}

// Structured data extracted from a meeting transcript
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


// The result of analyzing a meeting transcript
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

// FIX: Add missing StrategyClassificationResult interface.
// The result of classifying a fund strategy
export interface StrategyClassificationResult {
  primaryStrategy: string;
  styleFocus: string[];
  optionalTag: string;
}