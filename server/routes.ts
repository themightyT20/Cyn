import express, { Request, Response, Router } from "express";
import { nanoid } from "nanoid";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { log } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: express.Express) {
  const router = Router();

  // Serve avatar image statically from public directory
  router.use('/avatar.png', express.static(path.join(__dirname, '..', 'public', 'avatar.png')));

  // Get all messages
  router.get("/api/messages", async (_req: Request, res: Response) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  // Add a new message
  router.post("/api/messages", async (req: Request, res: Response) => {
    const { content, role, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    try {
      const newMessage = await storage.addMessage({
        content,
        role: role || "user",
        metadata: metadata || {}
      });
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ message: "Error adding message" });
    }
  });

  // Add training data
  router.post("/api/training", async (req: Request, res: Response) => {
    const { content, category } = req.body;

    if (!content || !category) {
      return res.status(400).json({ message: "Content and category are required" });
    }

    try {
      const newTrainingData = await storage.addTrainingData({
        content,
        category
      });
      res.status(201).json(newTrainingData);
    } catch (error) {
      console.error("Error adding training data:", error);
      res.status(500).json({ message: "Error adding training data" });
    }
  });

  // Web search endpoint using RapidAPI
  router.get("/api/search", async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    try {
      const response = await fetch(`https://google-web-search1.p.rapidapi.com/?query=${encodeURIComponent(query)}&limit=10`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': process.env.RAPID_API_KEY as string,
          'X-RapidAPI-Host': 'google-web-search1.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`RapidAPI returned ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error performing web search:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      });
    }
  });

  // YouTube search endpoint using RapidAPI
  router.get("/api/youtube-search", async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    try {
      const response = await fetch(`https://youtube-search-results.p.rapidapi.com/youtube-search/?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': process.env.RAPID_API_KEY as string,
          'X-RapidAPI-Host': 'youtube-search-results.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`RapidAPI returned ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error performing YouTube search:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      });
    }
  });

  // Generate image endpoint using DeepAI
  router.post("/api/generate-image", async (req: Request, res: Response) => {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: "Prompt is required" 
      });
    }

    try {
      const response = await fetch('https://api.deepai.org/api/text2img', {
        method: 'POST',
        headers: {
          'api-key': process.env.DEEP_AI_KEY as string,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: prompt })
      });

      if (!response.ok) {
        throw new Error(`DeepAI API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({ 
        success: true,
        imageUrl: data.output_url,
        message: "Image generated successfully"
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      });
    }
  });

  app.use(router);
  return app.listen();
}