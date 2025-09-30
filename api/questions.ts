import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './lib/storage-vercel';
import { questionRequestSchema, type QuestionResponse } from './lib/schema';
import { z } from 'zod';

// Question matching service
class QuestionMatchingService {
  async findBestMatch(question: string, placeholders?: Record<string, string>): Promise<{ answer: any; confidence: "high" | "medium" | "low" } | null> {
    const answers = await storage.getAllAnswers();
    let processedQuestion = question.toLowerCase();

    if (placeholders) {
      for (const [key, value] of Object.entries(placeholders)) {
        const placeholderPattern = new RegExp(`\\{${key}\\}`, 'gi');
        processedQuestion = processedQuestion.replace(placeholderPattern, value.toLowerCase());
      }
    }

    let bestMatch = null;
    let highestScore = 0;

    for (const answer of answers) {
      let score = 0;
      const keywords = answer.keywords || [];

      if (answer.title.toLowerCase().includes(processedQuestion)) {
        score += 100;
      }

      for (const keyword of keywords) {
        if (processedQuestion.includes(keyword.toLowerCase())) {
          score += 10;
        }
      }

      if (answer.category && processedQuestion.includes(answer.category.toLowerCase())) {
        score += 20;
      }

      if (answer.answerType && processedQuestion.includes(answer.answerType.toLowerCase())) {
        score += 15;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = answer;
      }
    }

    if (!bestMatch || highestScore < 10) {
      return null;
    }

    let confidence: "high" | "medium" | "low" = "low";
    if (highestScore >= 50) confidence = "high";
    else if (highestScore >= 25) confidence = "medium";

    return { answer: bestMatch, confidence };
  }

  classifyQuestion(question: string): { type: "personal" | "market" | "financial_advice" | "portfolio"; message: string; actionText?: string } {
    const questionLower = question.toLowerCase();

    const personalKeywords = ["name", "address", "phone", "email", "advisor", "contact", "who am i", "my information", "account details"];
    if (personalKeywords.some(keyword => questionLower.includes(keyword))) {
      return {
        type: "personal",
        message: "I can help with portfolio analysis, but I don't have access to personal account information. You can find your account details in the main dashboard or contact your advisor directly.",
        actionText: "View Account Details"
      };
    }

    const marketKeywords = ["stock price", "market news", "interest rates", "fed", "inflation", "earnings", "when will", "what will happen"];
    if (marketKeywords.some(keyword => questionLower.includes(keyword))) {
      return {
        type: "market",
        message: "I specialize in your portfolio analysis. For real-time market data or economic forecasts, I'd recommend checking your trading platform or financial news sources.",
        actionText: "Open Market Data"
      };
    }

    const adviceKeywords = ["should i", "what should", "recommend", "advice", "strategy", "buy", "sell", "rebalance", "allocate"];
    if (adviceKeywords.some(keyword => questionLower.includes(keyword))) {
      return {
        type: "financial_advice",
        message: "This is a great question for personalized advice. I've added it to your advisor's review queue for detailed analysis. You should receive a response within 24 hours.",
        actionText: "Track Review Status"
      };
    }

    return {
      type: "portfolio",
      message: "I don't have specific data for this portfolio question yet. I've added it to our development queue to enhance my capabilities. Meanwhile, your advisor can provide detailed insights.",
      actionText: "Contact Advisor"
    };
  }
}

const questionMatcher = new QuestionMatchingService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const validatedData = questionRequestSchema.parse(req.body);

      const question = await storage.createQuestion({
        question: validatedData.question,
        context: validatedData.context || null,
      });

      const match = await questionMatcher.findBestMatch(validatedData.question, validatedData.placeholders);

      if (match) {
        await storage.updateQuestionStatus(question.id, "matched", match.answer.id);

        const response: QuestionResponse = {
          id: question.id,
          status: "matched",
          answer: {
            id: match.answer.id,
            title: match.answer.title,
            content: match.answer.content,
            category: match.answer.category,
            answerType: match.answer.answerType,
            data: match.answer.data,
          },
          confidence: match.confidence,
          message: `Found ${match.confidence} confidence match`,
        };

        return res.status(200).json(response);
      } else {
        const classification = questionMatcher.classifyQuestion(validatedData.question);

        const status = classification.type === "financial_advice" ? "review" : "no_match";
        await storage.updateQuestionStatus(question.id, status);

        const response: QuestionResponse = {
          id: question.id,
          status: status as "matched" | "review" | "no_match",
          message: classification.message,
          answer: classification.type !== "financial_advice" ? {
            id: `fallback-${classification.type}`,
            title: classification.type === "personal" ? "Account Information" :
                   classification.type === "market" ? "Market Data" :
                   "Portfolio Analysis",
            content: classification.message,
            category: "Fallback",
            answerType: classification.type,
            data: {
              fallbackType: classification.type,
              actionText: classification.actionText,
              isUnmatched: true
            }
          } : undefined
        };

        return res.status(200).json(response);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: error.errors
        });
      }
      console.error("Error processing question:", error);
      return res.status(500).json({
        message: "Internal server error while processing question"
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const questions = await storage.getQuestionsForReview();
      return res.status(200).json(questions);
    } catch (error) {
      console.error("Error fetching review questions:", error);
      return res.status(500).json({ message: "Failed to fetch questions for review" });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
