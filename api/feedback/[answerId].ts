import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage-vercel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { answerId } = req.query;

      if (typeof answerId !== 'string') {
        return res.status(400).json({ message: 'Invalid answerId parameter' });
      }

      const feedback = await storage.getFeedbackForAnswer(answerId);
      return res.status(200).json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      return res.status(500).json({ message: "Failed to fetch feedback" });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
