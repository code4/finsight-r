import { z } from "zod";

// Base types without Drizzle ORM dependencies
export type User = {
  id: string;
  username: string;
  password: string;
};

export type InsertUser = Omit<User, "id">;

export type Question = {
  id: string;
  question: string;
  context: any;
  status: string;
  matchedAnswerId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertQuestion = {
  question: string;
  context: any;
};

export type Answer = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  keywords: string[];
  answerType: string | null;
  data: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertAnswer = Omit<Answer, "id" | "isActive" | "createdAt" | "updatedAt">;

export type Feedback = {
  id: string;
  answerId: string | null;
  questionId: string | null;
  question: string | null;
  sentiment: "up" | "down";
  reasons: string[];
  comment: string | null;
  createdAt: Date;
};

export type InsertFeedback = Omit<Feedback, "id" | "createdAt">;

// Validation schemas
export const questionRequestSchema = z.object({
  question: z.string().min(1),
  context: z.any().optional(),
  placeholders: z.record(z.string()).optional(),
});

export const questionResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["matched", "review", "no_match"]),
  answer: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string().nullable(),
    answerType: z.string().nullable(),
    data: z.any(),
  }).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  message: z.string().optional(),
});

export const feedbackRequestSchema = z.object({
  answerId: z.string().optional(),
  questionId: z.string().optional(),
  question: z.string().optional(),
  sentiment: z.enum(["up", "down"]),
  reasons: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export type QuestionRequest = z.infer<typeof questionRequestSchema>;
export type QuestionResponse = z.infer<typeof questionResponseSchema>;
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
