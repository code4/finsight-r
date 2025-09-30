import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage-vercel';
import { feedbackRequestSchema } from '../shared/schema';
import { z } from 'zod';

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
      const validatedData = feedbackRequestSchema.parse(req.body);

      const feedback = await storage.createFeedback({
        answerId: validatedData.answerId,
        questionId: validatedData.questionId,
        question: validatedData.question,
        sentiment: validatedData.sentiment,
        reasons: validatedData.reasons,
        comment: validatedData.comment,
      });

      return res.status(200).json({
        id: feedback.id,
        message: feedback.sentiment === "up"
          ? "Thank you for your positive feedback!"
          : "Thank you for your feedback. We'll use this to improve our responses.",
        feedback: feedback
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid feedback format",
          errors: error.errors
        });
      }
      console.error("Error submitting feedback:", error);
      return res.status(500).json({
        message: "Failed to submit feedback"
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const feedback = await storage.getAllFeedback();
      return res.status(200).json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      return res.status(500).json({ message: "Failed to fetch feedback" });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
