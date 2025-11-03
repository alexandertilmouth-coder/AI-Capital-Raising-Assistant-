import { GoogleGenAI, Type } from "@google/genai";
import { Investor, InvestorAnalysisResult, Transaction, CsvInvestor, ScoredInvestor, FeedbackAnalysisResult, TranscriptAnalysisResult, ClosedDeal, StrategyClassificationResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const INVESTOR_ANALYSIS_PROMPT = `Based on the following Investment Memorandum, identify 3-5 potential institutional investors who would be the best fit for this opportunity. For each investor, provide their name, the company they work for (companyName), a URL for the company's website (companyUrl), a URL to their LinkedIn profile (linkedinUrl), their investment focus, a specific reason for their suitability, and an appropriateness weighting from 0-100. If a URL is not readily available, return an empty string. Also, generate a concise paragraph describing the ideal investor profile for this deal.`;

export const RECENT_TRANSACTIONS_PROMPT = `Based on the following Investment Memorandum, identify 3-5 notable recent transactions that are comparable to this opportunity. Focus on transactions within the same geography, asset class, and a similar deal size range. For each transaction, provide a brief summary highlighting its relevance.`;

export const DUE_DILIGENCE_PROMPT = `You are a senior investment professional with deep prior knowledge of the sector and geography relevant to the provided document. Generate a list of 10 critical due diligence questions you would bring to an investment committee meeting for this opportunity. The questions should be sharp, insightful, and designed to rigorously test the investment thesis.`;

export const FCA_EMAIL_PROMPT = `You are a Senior institutional salesperson at a UK-regulated Alternative Investment firm. Your task is to draft a short, direct, and highly persuasive outreach email to a prospective institutional investor based on the provided [INPUT TEXT].

The email must remain strictly compliant with UK Financial Conduct Authority (FCA) rules, ensuring it is clear, fair, and not misleading.

### Constraints & Tone:
1.  **Subject Line:** Maximum 8 words. Be persuasive, emphasizing the opportunity and target return.
2.  **Length:** The body must be exactly three short paragraphs.
3.  **Tone:** Formal, confident, and focused on proprietary access, compelling value, and security.

### Email Structure & Content Guidance:

**Subject:** [Generate a compelling subject line based on the constraints]

Hi {{First Name}},

**Paragraph 1: The Exclusive Hook (2 sentences)**
Introduce a specialized investment opportunity that capitalizes on current market conditions. Frame the strategy and asset class as a rare or proprietary way to access value, for instance, through unique sourcing channels in a dislocated market.

**Paragraph 2: The Value Proposition (2 sentences)**
Lead with the attractive target IRR range, immediately followed by the strong security structure that protects capital (e.g., Senior Secured, First-Lien). Then, state the target raise size and minimum investment to frame it as a limited and well-defined opportunity.

**Paragraph 3: Call to Action (2 sentences)**
Propose a brief introductory call for next week to determine strategic fit. Conclude by stating that a confidential teaser document is available upon confirmation of interest and professional investor status.

### Mandatory Omissions:
*   DO NOT include specific dates (e.g., maturity dates, lockup dates).
*   DO NOT include the Project Codename.
*   The final output should be only the email text, starting with the Subject line.

**INPUT TEXT:**
[Insert the full, comprehensive Investment Briefing Text here]`;

export const TRANSCRIPT_ANALYSIS_PROMPT = `You are an elite capital raising coach and analyst with over 20 years of experience. Your task is to analyze the following meeting transcript.

You will produce two types of output:
1.  **Meeting Debrief:** A factual summary, list of next steps, and structured data extraction.
2.  **Performance Coaching:** A detailed, constructive analysis of the salesperson's performance.

### 1. Meeting Debrief
From the transcript, you MUST extract the following information:
*   **Meeting Summary:** A concise, neutral summary of the key topics discussed, decisions made, and outcomes.
*   **Next Steps:** A clear, bulleted list of all actionable next steps for each party.
*   **Meeting Data:** Extract the following specific data points about the investor. If a specific piece of information is not mentioned in the transcript, you MUST use the value "N/A".
    *   Name (First)
    *   Name (Last)
    *   Company Name
    *   Fund Name
    *   Asset Class
    *   Geography
    *   Location
    *   Sector Focus
    *   Ticket Size ($M)

### 2. Performance Coaching
Evaluate the salesperson's performance and provide detailed feedback in Markdown format.
*   **Evaluation Criteria:** Benchmark against expert-level techniques in Rapport Building, Pitch Clarity, Active Listening, Objection Handling, and Closing.
*   **Analysis Output:** Provide an 'overallScore' (1-100), a 'summary' of performance, 'strengths', 'areasForImprovement', and 'actionableSuggestions'. The text-based fields must be formatted as Markdown bulleted lists.

### Transcript:
---
{transcriptText}
---

Return ONLY a valid JSON object matching the defined schema.`;

const STRATEGY_CATEGORISATION_PROMPT = `INSTRUCTION: Process the text provided under "INPUT DATA" using the rules defined in the "INTERNAL LEXICON" to generate a standardized "Internal Classification." Output the results in the required JSON format.

### INPUT DATA:
---
{inputText}
---

### INTERNAL LEXICON AND MAPPING RULES

**Rule 1: Primary Strategy (Target 1 - Core Classification)**
*   **Equity Hedge:** Keywords: Long/Short, Net Exposure, Beta-Neutral, Stock Picking, Sector Rotation. (Exclude: Fixed Income, Global Macro)
*   **Credit:** Keywords: Distressed Debt, High Yield, Corporate Bonds, Leveraged Loans, Fixed Income, Mezzanine. (Exclude: Equity, Currencies)
*   **Global Macro:** Keywords: Futures, Currency, FX, Rates, Monetary Policy, Geopolitical, Directional Bets. (Exclude: Stock Picking, Corporate Bonds)
*   **Arbitrage / Relative Value:** Keywords: Stat Arb, Merger Arbitrage, Convertible, Pair Trading, Delta-Neutral, Spread Trading. (Exclude: Directional, Activist)
*   **Private Equity / VC:** Keywords: Buyout, Venture Capital (VC), Growth Equity, Seed, Series A/B, Control, Portfolio Company. (Exclude: Public Market)

**Rule 2: Style Focus (Target 2 - Secondary Modifier)**
*   **Value Focus:** Keywords: Deeply Mispriced, Contrarian, Discount, Undervalued, Margin of Safety.
*   **Growth Focus:** Keywords: Disruptive, Exponential, Next-Gen, Future-Focused, Rapidly Expanding.
*   **Systematic / Quant:** Keywords: Algorithmic, Rules-Based, Statistical Model, Computer-Driven, Factor Exposure, High-Frequency.
*   **Activist:** Keywords: Shareholder Engagement, Board Seat, Governance, Strategic Overhaul.
*   **Distressed:** Keywords: Special Situations, Bankruptcy, Restructuring, Turnaround.
*   **Fundamental:** Keywords: Bottom-Up, Due Diligence, Thesis-Driven, Proprietary Research.
*   **Opportunistic:** Keywords: Flexible Mandate, Tactical Allocation, Market-Adaptive.

**Rule 3: Optional Tag (Target 3 - Geographic/Sector)**
*   **Emerging Markets (EM):** Keywords: Emerging, Frontier, Developing Nations.
*   **APAC / Europe / NA:** Keywords: Asia-Pacific, North America, European Focus.
*   **Technology / Healthcare / Energy:** Keywords: Tech, Software, AI, Pharma, Biotech, Oil & Gas.

### INSTRUCTIONS FOR JSON OUTPUT
Return a single JSON object.
- **primaryStrategy:** (string) Target 1 is mandatory. Use the best fit from Rule 1.
- **styleFocus:** (array of strings) Target 2 is mandatory. List one or more modifiers from Rule 2.
- **optionalTag:** (string) Target 3 is optional. If no clear tag exists, return an empty string "".

`;

export const generateSummary = async (documentText: string): Promise<string> => {
  const prompt = `You are a Senior Investment Analyst at a top-tier private equity firm. Your task is to analyze the provided internal Investment Memorandum and produce a professional, institutional-quality Investment Summary.

The summary must be structured, data-driven, and use precise financial terminology. It should be formatted in Markdown for clear presentation.

### Structure:

1.  **Executive Summary:** A concise, high-level overview (3-4 sentences) covering the core investment opportunity, the asset, and the primary value proposition.
2.  **Investment Thesis:** A bulleted list of the 3-5 key reasons why this is a compelling investment. Each point must be a strong, declarative statement.
3.  **Key Strengths & Differentiators:** A short paragraph highlighting unique competitive advantages, market positioning, or structural benefits.
4.  **Financial Snapshot:** Present the most critical financial data points in a simple, clear, bulleted list. Focus on the following key metrics if they are available in the source document:
    *   **LTM Revenue:**
    *   **LTM EBITDA:**
    *   **Revenue Growth (e.g., CAGR):**
    *   **EBITDA Margin (%):**
    *   **Valuation / Entry Multiple:**
    *   **Capital Raise Amount:**
5.  **Primary Risks & Mitigants:** A bulleted list identifying 2-3 primary risks and the corresponding mitigating factors.

### Instructions:
*   **Tone:** Formal, objective, and analytical.
*   **Specificity:** Refer to specific quantitative data (e.g., revenue figures, EBITDA margins, market size, target IRR) from the source document to substantiate all claims. Avoid vague statements.
    {/* FIX: Escaped backticks in template literal to prevent syntax errors. */}
*   **Format:** Use Markdown for all formatting (e.g., \\\`### Heading\\\`, \\\`* Bullet Point\\\`, \\\`**Bold Text**\\\`).

### DOCUMENT:
---
${documentText}
---

### INVESTMENT SUMMARY:`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};

export const generateTeaser = async (documentText: string): Promise<string> => {
  const prompt = `You are a highly experienced Investment Banking Analyst specializing in Private Capital Markets (PCM). Your task is to transform a detailed, internal Investment Brief into a compelling, confidential **Blind Investment Teaser** designed to capture the attention of sophisticated institutional investors (Professional Investors Only).

The Teaser must strictly adhere to the following structure, content requirements, and professional tone. Your response must follow this exact numbered sequence of sections. Do not deviate from the numbering. The entire output must be formatted in clean, readable Markdown.

### 1. Title and Header
* **Title:** Create a compelling, codename-style title for the investment (e.g., "Project [Unique Industry Term/Location]"). Do not use the actual company/project name from the input.
* **Company/Issuer Name:** Omit the name of the Company or Issuer. Use a generic descriptor based on the primary sector/asset class (e.g., "A Vertically Integrated SaaS Platform," "A Mid-Market Healthcare Provider," or "A Leading Distressed Credit Fund").

### 2. Investment Opportunity (Section)
* **Goal:** Write a concise, 3-sentence summary of the investment, focusing on the core strategy, the asset class, and the primary market opportunity.
* **Key Inclusion:** Explicitly state the strategy (e.g., Growth Capital, Distressed Acquisition, Buyout, etc.) and the primary geographical focus.

### 3. Strategy & Value Proposition (Section)
* **Market/Sector Focus:** Highlight the **specific region or market sector** (e.g., North-Rhine Westphalia, US Fintech, European Infrastructure) and provide a single, strong statistic or trend about its importance.
* **Risk Mitigation/Entry:** Explain the entry angle. How is risk mitigated or value captured at entry? (e.g., deeply discounted acquisition, proprietary technology, strong balance sheet, long-term contracted revenues).
* **Value Creation Thesis:** Briefly outline the 2-3 main levers for generating returns (e.g., Operational improvements, M&A/roll-up, Revitalization and Leasing, or Organic Revenue Growth).

### 4. Investment Highlights (Section - Must be Bullet Points)
* Generate 3 to 5 powerful, marketing-oriented bullet points.
* **Valuation/Entry:** The first bullet must focus on the attractive entry valuation or price (e.g., "Substantial Discounted Acquisition" or "Proprietary Sourcing at Low Multiples").
* **Target Return:** The second bullet must quote the **target Internal Rate of Return (IRR) range** for the investment vehicle.
* **Market Tailwinds:** Include a bullet that connects the investment to a major **macro or secular trend** (e.g., Digitization, Affordable Housing Shortage, Regulatory Arbitrage).
* **Security/Structure:** Include a bullet describing the notes' or equity's security/preference structure (e.g., Senior Secured Notes, Preferred Equity Structure, First-Lien Debt).

### 5. Financial Overview (Section - Must be a Table)
* Create a table with only the following standardized fields. Do not include a "Description" column.
    * Instrument Type (e.g., Senior Notes, Common Equity, Preferred Shares)
    * Target Issue Size / Capital Raise
    * Minimum Investment
    * Target IRR (Investment Vehicle)
    * Maturity / Target Hold Period
    * Lockup Period

### 6. Disclaimer and Next Steps
* **Mandatory Disclaimer:** Conclude with a strong, explicit disclaimer that the investment is **speculative, involves a high degree of risk, and is available to professional investors only.**
* **Call to Action:** State that further due diligence materials (**PPM, Offering Memorandum, or Terms & Conditions**) are available upon request for a full investment decision.

**CRITICAL OMISSION RULES:**
* **DO NOT** use the actual code name from the input document if it is known. Create a new one.
* **DO NOT** include any specific, non-range, non-target projection numbers (e.g., specific yields, specific cash flow projections for individual assets). Only use the overall target return range.
* **DO NOT** mention the LTM Revenue or LTM EBITDA unless the underlying asset is a private company being bought. If the asset is a company, you may substitute "Target Issue Size" with "Valuation Multiples" in the table.

### DOCUMENT:
---
${documentText}
---

### BLIND INVESTMENT TEASER:`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};


export const identifyInvestors = async (documentText: string): Promise<InvestorAnalysisResult> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      investors: {
        type: Type.ARRAY,
        description: "A list of 3-5 potential institutional investors.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The name of the investment firm.",
            },
            companyName: {
              type: Type.STRING,
              description: "The name of the company the investor works for.",
            },
            companyUrl: {
              type: Type.STRING,
              description: "The URL of the company's website.",
            },
            linkedinUrl: {
              type: Type.STRING,
              description: "The URL of the investor's LinkedIn profile.",
            },
            focus: {
              type: Type.STRING,
              description: "The firm's primary investment focus (e.g., 'Growth Equity', 'Infrastructure', 'Healthcare Buyouts').",
            },
            reason: {
              type: Type.STRING,
              description: "A brief, specific reason why this firm is a good fit for this particular deal, based on the document.",
            },
            weighting: {
              type: Type.NUMBER,
              description: "An appropriateness score from 0 to 100, where 100 is a perfect match.",
            },
          },
          required: ["name", "companyName", "companyUrl", "linkedinUrl", "focus", "reason", "weighting"],
        },
      },
      idealProfile: {
          type: Type.STRING,
          description: "A concise, one-paragraph summary of the ideal investor profile for this deal, including typical focus, fund size, and risk appetite."
      }
    },
    required: ["investors", "idealProfile"],
  };

  const prompt = `${INVESTOR_ANALYSIS_PROMPT}

### DOCUMENT:
---
${documentText}
---

### ANALYSIS:`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const jsonText = response.text.trim();
  const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');
  
  try {
    const result = JSON.parse(cleanedJson);
    if (result && Array.isArray(result.investors) && typeof result.idealProfile === 'string') {
        return result as InvestorAnalysisResult;
    } else {
        throw new Error("Parsed JSON does not match expected structure.");
    }
  } catch (e) {
      console.error("Failed to parse JSON response:", e, "\nRaw response:", cleanedJson);
      throw new Error("The AI returned an invalid data structure for the investor analysis.");
  }
};

export const identifyRecentTransactions = async (documentText: string): Promise<Transaction[]> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            transactions: {
                type: Type.ARRAY,
                description: "A list of 3-5 recent, comparable transactions.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: {
                            type: Type.STRING,
                            description: "The name of the transaction or project (e.g., 'Acquisition of Project Blue').",
                        },
                        geography: {
                            type: Type.STRING,
                            description: "The geographical location of the transaction.",
                        },
                        assetClass: {
                            type: Type.STRING,
                            description: "The asset class (e.g., 'Logistics Real Estate', 'Mid-Market SaaS').",
                        },
                        dealSize: {
                            type: Type.STRING,
                            description: "The approximate size of the deal (e.g., '~$150M', '€50-75M range').",
                        },
                        summary: {
                            type: Type.STRING,
                            description: "A brief summary explaining the transaction and its relevance to the provided document.",
                        }
                    },
                    required: ["name", "geography", "assetClass", "dealSize", "summary"],
                },
            },
        },
        required: ["transactions"],
    };

    const prompt = `${RECENT_TRANSACTIONS_PROMPT}

### DOCUMENT:
---
${documentText}
---

### RECENT TRANSACTIONS:`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');

    try {
        const result = JSON.parse(cleanedJson);
        if (result && Array.isArray(result.transactions)) {
            return result.transactions as Transaction[];
        } else {
            console.warn("No transactions found or response format is unexpected.", result);
            return [];
        }
    } catch (e) {
        console.error("Failed to parse JSON response for transactions:", e, "\nRaw response:", cleanedJson);
        throw new Error("The AI returned an invalid data structure for the recent transactions analysis.");
    }
};

export const generateDiligenceQuestions = async (documentText: string): Promise<string[]> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            questions: {
                type: Type.ARRAY,
                description: "A list of 10 critical due diligence questions.",
                items: {
                    type: Type.STRING,
                    description: "A single due diligence question."
                }
            }
        },
        required: ["questions"]
    };

    const prompt = `${DUE_DILIGENCE_PROMPT}

### DOCUMENT:
---
${documentText}
---

### DUE DILIGENCE QUESTIONS:`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');

    try {
        const result = JSON.parse(cleanedJson);
        if (result && Array.isArray(result.questions)) {
            return result.questions as string[];
        } else {
            console.warn("No questions found or response format is unexpected.", result);
            return [];
        }
    } catch (e) {
        console.error("Failed to parse JSON response for diligence questions:", e, "\nRaw response:", cleanedJson);
        throw new Error("The AI returned an invalid data structure for the due diligence report.");
    }
};

export const generateFcaEmail = async (documentText: string): Promise<string> => {
  const prompt = FCA_EMAIL_PROMPT.replace(
      '[Insert the full, comprehensive Investment Briefing Text here]',
      documentText
  );

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};

export const scoreInvestors = async (idealProfile: string, investors: CsvInvestor[]): Promise<ScoredInvestor[]> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      scoredInvestors: {
        type: Type.ARRAY,
        description: "A list of investors scored against the ideal profile.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The name of the investor, matching one of the names from the input.",
            },
            matchScore: {
              type: Type.NUMBER,
              description: "The suitability score from 0 to 100.",
            },
            reason: {
              type: Type.STRING,
              description: "A brief justification for the score.",
            },
            companyName: {
              type: Type.STRING,
              description: "The investor's company name, passed through from the input data. Should be an empty string if not provided.",
            },
            companyUrl: {
              type: Type.STRING,
              description: "The investor's company URL, passed through from the input data. Should be an empty string if not provided.",
            },
            linkedinUrl: {
              type: Type.STRING,
              description: "The investor's LinkedIn URL, passed through from the input data. Should be an empty string if not provided.",
            },
          },
          required: ["name", "matchScore", "reason", "companyName", "companyUrl", "linkedinUrl"],
        },
      },
    },
    required: ["scoredInvestors"],
  };

  const investorListJson = JSON.stringify(investors, null, 2);

  const prompt = `You are an AI assistant for a capital raising firm. Your task is to analyze a list of potential investors against an "Ideal Investor Profile" for a specific investment opportunity.

Based on the provided Ideal Investor Profile and the list of investors from a database (in JSON format), score each investor's suitability on a scale of 0-100.

For each investor, you must provide:
1.  **name**: The investor's name. It must exactly match one of the names from the input list.
2.  **matchScore**: A numerical score from 0 to 100 representing the match quality.
3.  **reason**: A concise, one-sentence explanation for the score, referencing specifics from the investor's details and the ideal profile.
4.  **companyName**: The investor's company name from the input data.
5.  **companyUrl**: The company's URL from the input data.
6.  **linkedinUrl**: The investor's LinkedIn URL from the input data.

Analyze the 'Investment Focus', 'Description', or similar columns from the investor data as the primary factor for scoring. You MUST pass through the company name, company URL, and LinkedIn URL from the original input data for each respective investor.

### Ideal Investor Profile:
---
${idealProfile}
---

### Investor List (JSON):
---
${investorListJson}
---

Return ONLY a valid JSON object matching the defined schema.`;


  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const jsonText = response.text.trim();
  const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');
  
  try {
    const result = JSON.parse(cleanedJson);
    if (result && Array.isArray(result.scoredInvestors)) {
        return result.scoredInvestors as ScoredInvestor[];
    } else {
        throw new Error("Parsed JSON does not match expected structure for scored investors.");
    }
  } catch (e) {
      console.error("Failed to parse JSON response for investor scoring:", e, "\nRaw response:", cleanedJson);
      throw new Error("The AI returned an invalid data structure for the investor scoring.");
  }
};

export const analyzeInvestorFeedback = async (responseText: string, documentText: string): Promise<FeedbackAnalysisResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            interestScore: {
                type: Type.NUMBER,
                description: "The investor's interest level scored from 1 to 100."
            },
            intentCategory: {
                type: Type.STRING,
                description: "The category of the investor's intent. Must be one of: 'High Intent', 'Medium Intent', 'Mid Low Intent', 'Low Intent', 'Qualification/Questions'."
            },
            reasoning: {
                type: Type.STRING,
                description: "A brief, one-sentence justification for the score and category."
            },
            nextStep: {
                type: Type.STRING,
                description: "The recommended next action to take."
            },
            questionsAndAnswers: {
                type: Type.ARRAY,
                description: "A list of questions identified in the investor's response and their corresponding answers found in the source document. If no questions are found, this should be an empty array.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: {
                            type: Type.STRING,
                            description: "The exact question asked by the investor."
                        },
                        answer: {
                            type: Type.STRING,
                            description: "The answer found in the provided document context. If no answer is found, this field MUST be set to the exact string 'ACTION_REQUIRED: No answer found in the provided documents.'"
                        }
                    },
                    required: ["question", "answer"]
                }
            }
        },
        required: ["interestScore", "intentCategory", "reasoning", "nextStep", "questionsAndAnswers"]
    };

    const prompt = `You are an expert analyst for a top-tier investment firm, specializing in capital raising and investor relations. Your task is to analyze an investor's email response to an initial outreach message.

You will perform two tasks:
1.  **Sentiment and Intent Analysis**: Analyze the overall message to determine interest and suggest a next step.
2.  **Question & Answer Analysis**: Identify any specific questions and try to answer them using the provided document context.

### Task 1: Sentiment and Intent Analysis
Based on the provided "INVESTOR RESPONSE TEXT", you must:
1.  **Score the investor's interest level** on a scale from 1 to 100.
2.  **Categorize the investor's intent** into one of: 'High Intent', 'Medium Intent', 'Mid Low Intent', 'Low Intent', or 'Qualification/Questions'.
3.  **Provide a brief reasoning** for your score and categorization.
4.  **Suggest a clear, actionable next step**.

Use these guidelines for categorization:
*   **High Intent (80-100):** Clear buying signals like "Send the PPM," "What are the next steps?," "Do you have time this week?". Next Step: "Book a Meeting".
*   **Medium Intent (60-79):** Interested but wants more info. Keywords: "This looks interesting," "Can you send the teaser?". Next Step: "Send Teaser; do not push for a Meeting yet.".
*   **Mid Low Intent (40-59):** General information gathering or poor timing. Keywords: "send me more general info," "not in that market right now". Next Step: "Follow up in 1-2 Weeks.".
*   **Low Intent (1-39):** Clearly opting out. Keywords: "Please remove me," "Unsubscribe". Next Step: "Evaluate other Colleagues at the firm.".
*   **Qualification/Questions (65-85):** Engaging with specific deal points. Keywords: "What is the fee structure?," "Is this pari passu?". Next Step: "Answer questions immediately & push to set up a call.".

### Task 2: Question & Answer Analysis
After the sentiment analysis, you must also analyze the "INVESTOR RESPONSE TEXT" for any direct questions. If no document context is provided, you cannot answer questions.
For EACH question you identify:
1.  Search the provided "DOCUMENT CONTEXT" for a direct and concise answer.
2.  If you find an answer, provide it.
3.  If you CANNOT find an answer (or if no document context is provided), you MUST use the exact string: "ACTION_REQUIRED: No answer found in the provided documents."
4.  If there are no questions in the email, the 'questionsAndAnswers' array in your response must be empty.

### INVESTOR RESPONSE TEXT:
---
${responseText}
---

### DOCUMENT CONTEXT:
---
${documentText || 'No document context provided.'}
---

Return ONLY a valid JSON object matching the defined schema.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');
    
    try {
        const result = JSON.parse(cleanedJson);
        if (result && typeof result.interestScore === 'number') {
            return result as FeedbackAnalysisResult;
        } else {
            throw new Error("Parsed JSON does not match expected structure for feedback analysis.");
        }
    } catch (e) {
        console.error("Failed to parse JSON response for feedback analysis:", e, "\nRaw response:", cleanedJson);
        throw new Error("The AI returned an invalid data structure for the feedback analysis.");
    }
};

export const analyzeTranscript = async (transcriptText: string): Promise<TranscriptAnalysisResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            meetingData: {
                type: Type.OBJECT,
                description: "Structured data extracted from the meeting transcript about the investor.",
                properties: {
                    firstName: { type: Type.STRING, description: "Investor's first name. Use 'N/A' if not mentioned." },
                    lastName: { type: Type.STRING, description: "Investor's last name. Use 'N/A' if not mentioned." },
                    companyName: { type: Type.STRING, description: "Investor's company name. Use 'N/A' if not mentioned." },
                    fundName: { type: Type.STRING, description: "The specific fund name, if mentioned. Use 'N/A' if not." },
                    assetClass: { type: Type.STRING, description: "The investor's asset class focus. Use 'N/A' if not mentioned." },
                    geography: { type: Type.STRING, description: "The investor's geographical focus. Use 'N/A' if not mentioned." },
                    location: { type: Type.STRING, description: "The investor's physical location. Use 'N/A' if not mentioned." },
                    sectorFocus: { type: Type.STRING, description: "The investor's sector focus. Use 'N/A' if not mentioned." },
                    ticketSize: { type: Type.STRING, description: "The investor's typical ticket size in millions (e.g., '50-100'). Use 'N/A' if not mentioned." }
                },
                required: ["firstName", "lastName", "companyName", "fundName", "assetClass", "geography", "location", "sectorFocus", "ticketSize"]
            },
            meetingSummary: {
                type: Type.STRING,
                description: "A concise summary of the meeting's key discussion points and outcomes."
            },
            nextSteps: {
                type: Type.STRING,
                description: "A Markdown bulleted list of actionable next steps."
            },
            overallScore: {
                type: Type.NUMBER,
                description: "A numerical score from 1 to 100 for the salesperson's overall performance."
            },
            summary: {
                type: Type.STRING,
                description: "A 2-3 sentence executive summary of the performance analysis."
            },
            strengths: {
                type: Type.STRING,
                description: "A Markdown bulleted list of 3-4 key things the salesperson did well."
            },
            areasForImprovement: {
                type: Type.STRING,
                description: "A Markdown bulleted list of the 3-4 most critical areas needing improvement."
            },
            actionableSuggestions: {
                type: Type.STRING,
                description: "A Markdown bulleted list of concrete, actionable suggestions. Use 'What was said' vs. 'What could have been said' examples."
            }
        },
        required: ["meetingData", "meetingSummary", "nextSteps", "overallScore", "summary", "strengths", "areasForImprovement", "actionableSuggestions"]
    };

    const prompt = TRANSCRIPT_ANALYSIS_PROMPT.replace('{transcriptText}', transcriptText);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');
    
    try {
        const result = JSON.parse(cleanedJson);
        if (result && typeof result.overallScore === 'number' && result.meetingData) {
            return result as TranscriptAnalysisResult;
        } else {
            throw new Error("Parsed JSON does not match expected structure for transcript analysis.");
        }
    } catch (e) {
        console.error("Failed to parse JSON response for transcript analysis:", e, "\nRaw response:", cleanedJson);
        throw new Error("The AI returned an invalid data structure for the transcript analysis.");
    }
};

export const FIND_CLOSED_DEALS_PROMPT = `Find 40 significant private capital fund deals, the list must include deals from each region: Europe, North America and Asia, that have been publicly announced as closed within the last 90 days. Focus on announcements from major placement agents (e.g., Rede Partners, Campbell Lutyens, PJT Park Hill, UBS Private Funds Group, Lazard Private Capital Advisory, Probitas Partners, Eaton Partners, Asante Capital Group, Atlantic Pacific Capital, Triago, Greenstone Equity Partners, DC Placement Advisors, Evercore) or reputable financial news sources.

For each deal, you MUST provide the following structured information:
- dealName: The full name of the fund that closed.
- placementAgent: The primary placement agent involved. If not mentioned, state "N/A".
- fundSize: The final close size of the fund, including the currency (e.g., "€2.5 billion", "$750M").
- assetClass: Categorize as 'Private Equity', 'Private Credit', or 'Other'.
- strategy: A brief descriptor of the fund's strategy (e.g., "Mid-Cap Buyout", "Growth Equity", "Senior Direct Lending", "Infrastructure").
- sectorFocus: The primary industry or sector focus (e.g., "Healthcare", "Technology", "Consumer", "Sector-Agnostic").
- geographyFocus: The primary geographical investment area (e.g., "North America", "Europe", "Global").
- summary: A one-sentence summary of the deal, mentioning the fund's objective, including the close date.
- sourceUrl: The direct URL to the press release or news article.

Return the result as a valid JSON array of objects. Do not include any introductory text, just the raw JSON array.`;

export const findClosedDeals = async (): Promise<ClosedDeal[]> => {
    const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: FIND_CLOSED_DEALS_PROMPT,
       config: {
         tools: [{googleSearch: {}}],
       },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');

    try {
        const result = JSON.parse(cleanedJson);
        if (Array.isArray(result)) {
            // Basic validation
            return result.filter(item => item.dealName && item.sourceUrl && item.fundSize) as ClosedDeal[];
        } else {
            throw new Error("Parsed JSON is not an array.");
        }
    } catch (e) {
        console.error("Failed to parse JSON response for closed deals:", e, "\nRaw response:", cleanedJson);
        throw new Error("The AI returned an invalid data structure for the closed deals search.");
    }
};

export const generateMarketAppetiteAnalysis = async (deals: ClosedDeal[]): Promise<string> => {
    const prompt = `You are a top-tier market intelligence analyst for a private capital advisory firm. Based on the following JSON data of recently closed funds, generate a "Market Appetite" analysis.

The analysis must be in Markdown format and contain the following sections:

### Last 120 days Market Appetite Score
Provide an overall score from 1-100 representing the current fundraising environment's health (higher is better). Justify the score in one sentence, referencing the volume and size of recent closes.

### Executive Summary
A short paragraph summarizing the key trends observed from the data. Highlight which asset classes and strategies are seeing the most momentum.

### Appetite Breakdown
A bulleted list analyzing the market appetite by category. For each major category (e.g., Private Equity, Private Credit) and strategy (e.g., Mid-Cap Buyout, Direct Lending) present in the data:
- Briefly describe the current investor appetite.
- Mention the total capital raised for that category from the provided data.
- Point out any notable trends (e.g., "Strong demand for tech-focused growth equity funds in North America continues...").

### DATA:
---
${JSON.stringify(deals, null, 2)}
---

CRITICAL: Your response must begin directly with the first Markdown heading. Do not include any introductory phrases like 'Of course...' or 'Here is the analysis...'.

### ANALYSIS:`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });

    return response.text;
};

export const categoriseFundStrategy = async (inputText: string): Promise<StrategyClassificationResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            primaryStrategy: {
                type: Type.STRING,
                description: "The core classification from Rule 1."
            },
            styleFocus: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                },
                description: "A list of one or more secondary modifiers from Rule 2."
            },
            optionalTag: {
                type: Type.STRING,
                description: "An optional geographic or sector tag from Rule 3. Can be an empty string."
            }
        },
        required: ["primaryStrategy", "styleFocus", "optionalTag"]
    };

    const prompt = STRATEGY_CATEGORISATION_PROMPT.replace('{inputText}', inputText);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');
    
    try {
        const result = JSON.parse(cleanedJson);
        if (result && result.primaryStrategy && Array.isArray(result.styleFocus)) {
            return result as StrategyClassificationResult;
        } else {
            throw new Error("Parsed JSON does not match expected structure for strategy categorization.");
        }
    } catch (e) {
        console.error("Failed to parse JSON response for strategy categorization:", e, "\nRaw response:", cleanedJson);
        throw new Error("The AI returned an invalid data structure for the strategy categorization.");
    }
};