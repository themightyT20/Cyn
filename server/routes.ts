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
        // You'll need to add your RapidAPI key as an environment variable
        const rapidApiKey = process.env.RAPID_API_KEY;
        
        if (!rapidApiKey) {
          log("No RapidAPI key found, returning description only");
          return res.json({
            success: true,
            description: description,
            imageUrl: "https://placehold.co/600x400?text=No+RapidAPI+Key",
            message: "Add a RAPID_API_KEY environment variable to generate actual images"
          });
        }

        // Using the Deep AI Text to Image API from RapidAPI
        const options = {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'dezgo.p.rapidapi.com'
          },
          body: JSON.stringify({
            prompt: prompt,
            guidance: 7.5,
            steps: 30,
            sampler: 'euler_a',
            upscale: 1,
            negative_prompt: 'blurry, bad quality, distorted'
          })
        };

        const imageResponse = await fetch('https://dezgo.p.rapidapi.com/text2image', options);
        
        if (!imageResponse.ok) {
          throw new Error(`RapidAPI returned ${imageResponse.status}`);
        }

        // The response is a binary image, so we need to convert it to a data URL
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        res.json({ 
          success: true,
          imageUrl: dataUrl,
          description: description,
          message: "Image generated successfully with RapidAPI"
        });
      } catch (error) {
        console.error("RapidAPI image generation error:", error);
        // Fall back to description only if RapidAPI fails
        res.json({ 
          success: true,
          description: description,
          imageUrl: "https://placehold.co/600x400?text=API+Error",
          message: "Error with RapidAPI. Using description only."
        });
      }
    } catch (error) {
      console.error("Image generation request error:", error);
      res.status(500).json({ error: "Failed to process image generation request" });
    }
  });

  return createServer(app);
}