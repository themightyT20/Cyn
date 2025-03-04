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
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid message format" });
    }

    const model = gemini.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(parsed.data.content);
    const response = await result.response;
    
    const userMessage = await storage.addMessage(parsed.data);
    const aiMessage = await storage.addMessage({
      content: response.text(),
      role: "assistant",
      metadata: {}
    });

    res.json([userMessage, aiMessage]);
  });

  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;
    const model = gemini.getGenerativeModel({ model: "gemini-pro-vision" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ imageUrl: response.text() });
  });

  app.get("/api/search", async (req, res) => {
    const { query } = req.query;
    const response = await axios.get("https://google-search72.p.rapidapi.com/search", {
      params: { q: query },
      headers: {
        "X-RapidAPI-Key": RAPID_API_KEY,
        "X-RapidAPI-Host": "google-search72.p.rapidapi.com"
      }
    });
    res.json(response.data);
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
