import express, { Request, Response, Router } from "express";
import { nanoid } from "nanoid";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { log } from "./vite";

// Convert URL to file path for ES modules
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

  // Web search endpoint
  router.get("/api/search", async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    try {
      // For now, return a mock response
      const mockResults = {
        query,
        results: [
          { title: "Sample result 1", snippet: "This is a sample search result" },
          { title: "Sample result 2", snippet: "Another sample search result" }
        ]
      };

      res.json(mockResults);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  // Generate image endpoint
  router.post("/api/generate-image", async (req: Request, res: Response) => {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: "Prompt is required" 
      });
    }

    const description = prompt.substring(0, 50) + "...";

    try {
      // Use Hugging Face's public model for image generation
      const payload = {
        inputs: prompt,
        options: {
          wait_for_model: true
        }
      };

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      };

      const imageResponse = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', options);

      if (!imageResponse.ok) {
        throw new Error(`Hugging Face API returned ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;

      res.json({ 
        success: true,
        imageUrl: imageUrl,
        description: description,
        message: "Image generated successfully with Hugging Face Stable Diffusion"
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