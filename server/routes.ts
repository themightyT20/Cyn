import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { insertMessageSchema } from "@shared/schema";
import { log } from "./vite";

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

      // Store the user message first
      const userMessage = await storage.addMessage(parsed.data);

      try {
        // Generate AI response
        const model = gemini.getGenerativeModel({ model: "gemini-pro" });
        log("Sending request to Gemini API...");

        const prompt = `You are Cyn, a knowledgeable and friendly AI assistant. 
        Respond to: ${parsed.data.content}
        Keep responses concise and natural.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        log("Generated response:", responseText);

        // Store AI response
        const aiMessage = await storage.addMessage({
          content: responseText,
          role: "assistant",
          metadata: {}
        });

        res.json([userMessage, aiMessage]);
      } catch (error) {
        console.error("Gemini API error:", error);
        // If AI fails, still send the user message back
        res.json([userMessage]);
      }
    } catch (error) {
      console.error("Message handling error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  return createServer(app);
}