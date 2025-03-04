
import express, { Request, Response, Router } from "express";
import { nanoid } from "nanoid";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "http";
import { log } from "./vite";

// Convert URL to file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load/Create messages storage
const messagesPath = path.join(__dirname, "..", "messages.json");
const messages: any[] = [];

async function loadMessages() {
  if (existsSync(messagesPath)) {
    const data = await fs.readFile(messagesPath, "utf8");
    messages.push(...JSON.parse(data));
  }
}

async function saveMessages() {
  await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2));
}

// Initialize messages
loadMessages();

export async function registerRoutes(app: express.Express) {
  const router = Router();

  // Get all messages
  router.get("/api/messages", (_req: Request, res: Response) => {
    res.json(messages);
  });

  // Add a new message
  router.post("/api/messages", async (req: Request, res: Response) => {
    const { content, role, metadata } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const newMessage = {
      id: nanoid(),
      content,
      role: role || "user",
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    messages.push(newMessage);
    await saveMessages();
    
    res.status(201).json(newMessage);
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
      // This doesn't require an API key for basic usage
      log("Using Hugging Face's text-to-image model");

      // Create a payload for the Hugging Face API
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

      // Using a public model from Hugging Face
      const imageResponse = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', options);

      if (!imageResponse.ok) {
        throw new Error(`Hugging Face API returned ${imageResponse.status}`);
      }

      // For Hugging Face, the response is the image blob directly
      // We need to create a base64 data URL from it
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
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use(router);

  return app.listen();
}
