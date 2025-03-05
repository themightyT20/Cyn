import express, { Request, Response, Router } from "express";
import { nanoid } from "nanoid";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { log } from "./vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: express.Express) {
  const router = Router();

  // Get all messages
  router.get("/api/messages", async (_req: Request, res: Response) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  // Add a new message and get AI response
  router.post("/api/messages", async (req: Request, res: Response) => {
    const { content, role, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    try {
      // Save user message
      const userMessage = await storage.addMessage({
        content,
        role: role || "user",
        metadata: metadata || {}
      });

      // Get AI response using the correct Gemini model
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      // Use gemini-1.5-pro-latest model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

      console.log("Generating AI response for:", content);
      const result = await model.generateContent(content);
      const response = await result.response;

      // Save AI response
      const aiMessage = await storage.addMessage({
        content: response.text(),
        role: "assistant",
        metadata: {}
      });

      res.status(201).json([userMessage, aiMessage]);
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ message: "Error processing message" });
    }
  });

  // Web search endpoint using DuckDuckGo
  router.get("/api/search", async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    try {
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`);

      if (!response.ok) {
        throw new Error(`DuckDuckGo API returned ${response.status}`);
      }

      const data = await response.json();

      // Transform DuckDuckGo results
      const results = [
        ...(data.AbstractText ? [{
          title: data.AbstractSource,
          snippet: data.AbstractText,
          link: data.AbstractURL
        }] : []),
        ...(data.RelatedTopics || []).map((topic: any) => ({
          title: topic.FirstURL?.split('/').pop()?.replace(/-/g, ' ') || '',
          snippet: topic.Text || '',
          link: topic.FirstURL || ''
        }))
      ];

      res.json({ 
        success: true,
        results: results
      });
    } catch (error) {
      console.error("Error performing web search:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      });
    }
  });

  // Generate image endpoint
  router.post("/api/generate-image", async (req: Request, res: Response) => {
    const { prompt } = req.body;
    const apiKey = process.env.DEEP_AI_KEY;

    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: "Prompt is required" 
      });
    }

    if (!apiKey) {
      console.error("DeepAI API key is missing");
      return res.status(500).json({
        success: false,
        error: "API key configuration is missing"
      });
    }

    try {
      console.log("Generating image with prompt:", prompt);
      
      // Use FormData instead of JSON for DeepAI API
      const formData = new FormData();
      formData.append('text', prompt);
      
      const response = await fetch('https://api.deepai.org/api/text2img', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DeepAI API error (${response.status}):`, errorText);
        throw new Error(`DeepAI API returned ${response.status}: ${errorText}`);
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