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

      // Store the user message
      const userMessage = await storage.addMessage(parsed.data);

      try {
        // Set up chat model with Gemini 1.5 Flash
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        log("Sending request to Gemini API...");

        // Send message to chat model
        const result = await model.generateContent(parsed.data.content);
        const response = await result.response;
        const responseText = response.text();
        log("Generated response:", responseText);

        // Store and send AI response
        const aiMessage = await storage.addMessage({
          content: responseText,
          role: "assistant",
          metadata: {}
        });

        res.json([userMessage, aiMessage]);
      } catch (error) {
        console.error("Gemini API error:", error);
        // If AI fails, still send back the user message and a fallback message
        const fallbackMessage = await storage.addMessage({
          content: "I'm having trouble connecting to my AI services. Can you try again later?",
          role: "assistant",
          metadata: {}
        });
        res.json([userMessage, fallbackMessage]);
      }
    } catch (error) {
      console.error("Message handling error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  return createServer(app);
}