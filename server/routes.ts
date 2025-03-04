import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { insertMessageSchema, insertTrainingDataSchema } from "@shared/schema";
import axios from "axios";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const RAPID_API_KEY = process.env.RAPID_API_KEY || "";

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

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      // Using Gemini to generate image description
      const model = gemini.getGenerativeModel({ model: "gemini-1.0-pro" });
      const result = await model.generateContent(
        `Create a detailed description for generating an image of: ${prompt}. 
         Focus on visual details, style, and composition.`
      );
      const imageDescription = await result.response.text();

      // For demo purposes, returning a placeholder image URL
      // In a real application, you would integrate with an image generation API
      res.json({ 
        imageUrl: `https://picsum.photos/800/600?random=${Date.now()}`,
        description: imageDescription 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      // Web Search
      const webResponse = await axios.get("https://google-search72.p.rapidapi.com/search", {
        params: { q: query },
        headers: {
          "X-RapidAPI-Key": RAPID_API_KEY,
          "X-RapidAPI-Host": "google-search72.p.rapidapi.com"
        }
      });

      // YouTube Search
      const youtubeResponse = await axios.get("https://youtube-search-and-download.p.rapidapi.com/search", {
        params: { query, type: "video" },
        headers: {
          "X-RapidAPI-Key": RAPID_API_KEY,
          "X-RapidAPI-Host": "youtube-search-and-download.p.rapidapi.com"
        }
      });

      res.json({
        webResults: webResponse.data.items || [],
        youtubeResults: youtubeResponse.data.contents || []
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  app.post("/api/training", async (req, res) => {
    const parsed = insertTrainingDataSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid training data format" });
    }
    const data = await storage.addTrainingData(parsed.data);
    res.json(data);
  });

  return createServer(app);
}