import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage-vercel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const answers = await storage.getAllAnswers();
      return res.status(200).json(answers);
    } catch (error) {
      console.error("Error fetching answers:", error);
      return res.status(500).json({ message: "Failed to fetch answers" });
    }
  }

  if (req.method === 'POST') {
    try {
      const answer = await storage.createAnswer(req.body);
      return res.status(200).json(answer);
    } catch (error) {
      console.error("Error creating answer:", error);
      return res.status(500).json({ message: "Failed to create answer" });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
