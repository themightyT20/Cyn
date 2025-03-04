import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { insertMessageSchema } from "@shared/schema";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function registerRoutes(app: Express) {
  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid message format" });
      }

      const model = gemini.getGenerativeModel({ model: "gemini-1.0-pro" });
      const result = await model.generateContent(parsed.data.content);
      const response = await result.response;

      const userMessage = await storage.addMessage(parsed.data);
      const aiMessage = await storage.addMessage({
        content: response.text(),
        role: "assistant",
        metadata: {}
      });

      res.json([userMessage, aiMessage]);
    } catch (error) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  return createServer(app);
}