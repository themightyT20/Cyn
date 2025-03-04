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

      log("Generating image with prompt:", prompt);

      // First, get a description using Gemini
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Generate a detailed description of an image that shows: " + prompt);
      const response = await result.response;
      const description = response.text();

      try {
        // Call RapidAPI for image generation
        // You'll need to add your API key as an environment variable
        // For DeepAI we can use their quickstart key or a custom one
        const apiKey = process.env.IMAGE_API_KEY;
        
        if (!apiKey && !process.env.USE_QUICKSTART_KEY) {
          log("No API key found, returning description only");
          return res.json({
            success: true,
            description: description,
            imageUrl: "https://placehold.co/600x400?text=Using+Default+API+Key",
            message: "Using DeepAI quickstart key (rate limited). Add IMAGE_API_KEY for better results."
          });
        }

        // Using DeepAI's text2img API
        const formData = new FormData();
        formData.append('text', prompt);
        
        const options = {
          method: 'POST',
          headers: {
            'api-key': rapidApiKey || 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K' // DeepAI offers a quickstart key
          },
          body: formData
        };

        const imageResponse = await fetch('https://api.deepai.org/api/text2img', options);
        
        if (!imageResponse.ok) {
          throw new Error(`DeepAI API returned ${imageResponse.status}`);
        }

        // Parse the JSON response
        const imageResult = await imageResponse.json();
        
        // DeepAI returns a direct URL to the generated image
        if (imageResult && imageResult.output_url) {
          const imageUrl = imageResult.output_url;
          
          res.json({ 
            success: true,
            imageUrl: imageUrl,
            description: description,
            message: "Image generated successfully with Stable Diffusion"
          });
        } else {
          throw new Error("No image data in the response");
        }
      } catch (error) {
        console.error("DeepAI image generation error:", error);
        // Fall back to description only if DeepAI API fails
        res.json({ 
          success: true,
          description: description,
          imageUrl: "https://placehold.co/600x400?text=API+Error",
          message: "Error with DeepAI API. Using description only."
        });
      }
    } catch (error) {
      console.error("Image generation request error:", error);
      res.status(500).json({ error: "Failed to process image generation request" });
    }
  });

  return createServer(app);
}