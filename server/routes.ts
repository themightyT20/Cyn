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

  // Add image generation endpoint
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter" });
      }

      // Use Gemini for image generation
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
      log("Generating image with prompt:", prompt);

      try {
        // For Gemini, we need to use text to describe what we want
        const result = await model.generateContent("Generate a detailed description of an image that shows: " + prompt);
        const response = await result.response;
        const description = response.text();

        // In a real implementation, you would use a service like Stable Diffusion or DALL-E
        // For now, return a placeholder with the description
        res.json({ 
          success: true,
          imageUrl: "https://placehold.co/600x400?text=Image+Generation",
          description: description,
          message: "Image generation with Gemini 1.5 Flash is text-only. Please integrate with an image generation API for actual images."
        });
      } catch (error) {
        console.error("Image generation error:", error);
        res.status(500).json({ error: "Failed to generate image" });
      }
    } catch (error) {
      console.error("Image generation request error:", error);
      res.status(500).json({ error: "Failed to process image generation request" });
    }
  });

  return createServer(app);
}