import express, { Request, Response, Router } from "express";
import { nanoid } from "nanoid";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { log } from "./vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define training data directory
const TRAINING_DATA_DIR = path.join(__dirname, '..', 'training-data', 'voice-samples');

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

  // Get list of voice samples
  router.get("/api/tts/voices", async (_req: Request, res: Response) => {
    try {
      // Check if directory exists
      let directoryExists = false;
      try {
        await fs.access(TRAINING_DATA_DIR);
        directoryExists = true;
      } catch (e) {
        console.log(`Voice samples directory doesn't exist: ${TRAINING_DATA_DIR}`);
      }

      if (!directoryExists) {
        // Create directory if it doesn't exist
        await fs.mkdir(TRAINING_DATA_DIR, { recursive: true });
        console.log(`Created voice samples directory: ${TRAINING_DATA_DIR}`);
      }

      const files = await fs.readdir(TRAINING_DATA_DIR);
      const voiceFiles = files.filter(file => file.endsWith('.wav'));

      console.log(`Found ${voiceFiles.length} voice samples in ${TRAINING_DATA_DIR}`);
      
      res.json({
        success: true,
        samples: voiceFiles,
        directory: TRAINING_DATA_DIR
      });
    } catch (error) {
      console.error("Error getting voice samples:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error retrieving voice samples",
        error: String(error)
      });
    }
  });

  // Add TTS debug endpoint to verify voice samples and configuration
  router.get("/api/tts/debug", async (_req: Request, res: Response) => {
    try {
      const directories = [
        TRAINING_DATA_DIR,
        path.join(__dirname, '..', 'uploads', 'voice-samples')
      ];
      
      const results = {};
      
      for (const dir of directories) {
        try {
          const exists = await fs.access(dir).then(() => true).catch(() => false);
          if (exists) {
            const files = await fs.readdir(dir);
            const voiceFiles = files.filter(file => file.endsWith('.wav'));
            results[dir] = {
              exists: true,
              fileCount: files.length,
              voiceFiles: voiceFiles
            };
          } else {
            results[dir] = { exists: false };
          }
        } catch (err) {
          results[dir] = { exists: false, error: String(err) };
        }
      }
      
      res.json({
        success: true,
        diagnosticResults: results,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        audioEnabled: process.env.AUDIO_ENABLED === 'true'
      });
    } catch (error) {
      console.error("Error in TTS debug endpoint:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error running TTS diagnostics",
        error: String(error)
      });
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

      // Load Cyn training data
      const cynTrainingDataPath = path.join(__dirname, "..", "cyn-training-data.json");
      let cynData;
      try {
        const dataRaw = await fs.readFile(cynTrainingDataPath, 'utf-8');
        cynData = JSON.parse(dataRaw);
        console.log("Loaded Cyn training data successfully");
      } catch (err) {
        console.error("Error loading Cyn training data:", err);
        cynData = null;
      }

      // Get AI response using the correct Gemini model
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

      console.log("Generating AI response for:", content);

      // Build system prompt with Cyn's personality
      let systemPrompt = "You are a standard AI assistant.";
      let exampleConversations = [];

      if (cynData) {
        const { character, conversations, response_guidelines } = cynData;
        systemPrompt = `You are ${character.name}, ${character.personality}. ${character.background}. 
Your tone is ${character.tone}.
Your traits include: ${character.traits.join(', ')}.
Follow these guidelines: ${response_guidelines.general_approach}
Style preferences: ${response_guidelines.style_preferences.join(', ')}`;

        exampleConversations = conversations.map(conv => ({
          role: "user",
          parts: [{ text: conv.user }]
        })).flatMap((userMsg, i) => [
          userMsg,
          {
            role: "model",
            parts: [{ text: conversations[i].assistant }]
          }
        ]);
      }

      // Generate response
      const chat = model.startChat({
        history: exampleConversations,
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        }
      });

      // Get the AI's memory
      const memory = await storage.getMemory();

      // Include memory in the prompt if it exists
      let memoryPrompt = "";
      if (Object.keys(memory).length > 0) {
        memoryPrompt = "\n\nHere's information you remember about the user:\n";
        for (const [key, value] of Object.entries(memory)) {
          memoryPrompt += `- ${key}: ${value}\n`;
        }
      }

      const promptWithSystem = `${systemPrompt}${memoryPrompt}\n\nYou can remember new information about the user by including [MEMORY:key=value] anywhere in your response. This won't be shown to the user.\n\nUser message: ${content}`;
      const result = await chat.sendMessage(promptWithSystem);
      const response = await result.response;

      // Extract and process memory instructions from the response
      let responseText = response.text();
      const memoryRegex = /\[MEMORY:([^=]+)=([^\]]+)\]/g;
      let match;

      while ((match = memoryRegex.exec(responseText)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();
        await storage.updateMemory(key, value);
        console.log(`Memory updated: ${key} = ${value}`);
      }

      // Remove memory instructions from the final response
      responseText = responseText.replace(memoryRegex, "");

      // Save AI response
      const aiMessage = await storage.addMessage({
        content: responseText.trim(),
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
      // First try DuckDuckGo API
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`);

      if (!response.ok) {
        throw new Error(`DuckDuckGo API returned ${response.status}`);
      }

      const data = await response.json();

      // Transform DuckDuckGo results
      let results = [
        ...(data.AbstractText ? [{
          title: data.AbstractSource || "Summary",
          snippet: data.AbstractText,
          link: data.AbstractURL || "",
          source: data.AbstractSource || "DuckDuckGo",
          description: `Content from ${data.AbstractSource || "web"}: ${data.AbstractText?.substring(0, 120)}${data.AbstractText?.length > 120 ? '...' : ''}`
        }] : []),
        ...(data.RelatedTopics || []).map((topic: any) => {
          const websiteName = topic.FirstURL ? new URL(topic.FirstURL).hostname.replace('www.', '') : 'DuckDuckGo';
          const text = topic.Text || topic.Result?.replace(/<[^>]*>/g, '') || '';
          return {
            title: topic.FirstURL?.split('/').pop()?.replace(/-/g, ' ') || topic.Name || 'Related Topic',
            snippet: text,
            link: topic.FirstURL || topic.Results?.[0]?.FirstURL || '',
            source: websiteName,
            description: `From ${websiteName}: ${text.substring(0, 120)}${text.length > 120 ? '...' : ''}`
          };
        })
      ];

      // Also include Results if available (sometimes DuckDuckGo puts important info here)
      if (data.Results && Array.isArray(data.Results) && data.Results.length > 0) {
        const additionalResults = data.Results.map((result: any) => ({
          title: result.FirstURL?.split('/').pop()?.replace(/-/g, ' ') || result.Name || 'Search Result',
          snippet: result.Text || result.Result?.replace(/<[^>]*>/g, '') || '',
          link: result.FirstURL || ''
        }));
        results = [...results, ...additionalResults];
      }

      // If we still have no results, try a fallback scraping approach
      if (results.length === 0) {
        console.log("No results from DuckDuckGo API, trying fallback...");

        // Using DuckDuckGo HTML search as fallback
        const fallbackResponse = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
        const html = await fallbackResponse.text();

        // Very basic extraction of results from HTML (a more robust solution would use a proper HTML parser)
        const resultMatches = html.match(/<div class="result[^>]*>[\s\S]*?<\/div>/g);

        if (resultMatches && resultMatches.length > 0) {
          const fallbackResults = resultMatches.slice(0, 5).map(match => {
            // Extract title
            const titleMatch = match.match(/<a class="result__a"[^>]*>(.*?)<\/a>/);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'Search Result';

            // Extract snippet
            const snippetMatch = match.match(/<a class="result__snippet"[^>]*>(.*?)<\/a>/);
            const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '') : '';

            // Extract link
            const linkMatch = match.match(/href="([^"]*)/);
            const rawLink = linkMatch ? linkMatch[1] : '';

            // Handle DuckDuckGo's redirect URLs properly
            let link = rawLink;
            // Clean up DuckDuckGo redirect links to extract the actual URL
            if (rawLink.includes('//duckduckgo.com/l/')) {
              try {
                // Extract the actual URL from the uddg parameter
                const uddgMatch = rawLink.match(/uddg=([^&]+)/);
                if (uddgMatch && uddgMatch[1]) {
                  link = decodeURIComponent(uddgMatch[1]);
                }
              } catch (e) {
                console.log('Error extracting URL from DuckDuckGo redirect:', e);
              }
            }

            // Extract website name from link
            let source = 'DuckDuckGo';
            try {
              if (link && link.startsWith('http')) {
                source = new URL(link).hostname.replace('www.', '');
              }
            } catch (e) {
              console.log('Could not parse URL, using raw link instead');
              // Don't log the full URL to avoid console spam
            }

            return { 
              title, 
              snippet, 
              link, 
              source,
              description: `From ${source}: ${snippet.substring(0, 120)}${snippet.length > 120 ? '...' : ''}`
            };
          });

          results = fallbackResults;
        }
      }

      res.json({ 
        success: true,
        results: results,
        query: query, // Include the query in response for debugging
        source: "DuckDuckGo" // Add source information
      });
    } catch (error) {
      console.error("Error performing web search:", error);

      // Try a simple backup search approach as last resort
      try {
        console.log("Attempting last resort search method");
        const backupResponse = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
        const backupData = await backupResponse.json();

        // Create a simple result even if just returning the query
        const backupResults = [{
          title: backupData.Heading || query,
          snippet: backupData.AbstractText || `Search results for ${query}`,
          link: backupData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          source: backupData.AbstractSource || "DuckDuckGo",
          description: `From ${backupData.AbstractSource || "DuckDuckGo"}: ${backupData.AbstractText || `Search results for ${query}`}`
        }];

        return res.json({
          success: true,
          results: backupResults,
          isBackup: true
        });
      } catch (backupError) {
        // If all else fails, return the error
        return res.status(500).json({ 
          success: false, 
          error: backupError instanceof Error ? backupError.message : "An unexpected error occurred" 
        });
      }
    }
  });

  // Generate image endpoint
  router.post("/api/generate-image", async (req: Request, res: Response) => {
    const { prompt } = req.body;
    const apiKey = process.env.STABILITY_API_KEY;

    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: "Prompt is required" 
      });
    }

    if (!apiKey) {
      console.error("Stability API key is missing");
      return res.status(500).json({
        success: false,
        error: "API key configuration is missing"
      });
    }

    try {
      console.log("Generating image with prompt:", prompt);

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1.0
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Stability API error (${response.status}):`, errorData);
        throw new Error(`Stability API returned ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      // Stability API returns base64 encoded images
      const imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`;

      res.json({ 
        success: true,
        imageUrl,
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

  // Get AI memory
  router.get("/api/memory", async (_req: Request, res: Response) => {
    try {
      const memory = await storage.getMemory();
      res.json(memory);
    } catch (error) {
      console.error("Error fetching memory:", error);
      res.status(500).json({ message: "Error fetching memory" });
    }
  });

  // Update AI memory
  router.post("/api/memory", async (req: Request, res: Response) => {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ message: "Key is required" });
    }

    try {
      await storage.updateMemory(key, value);
      const memory = await storage.getMemory();
      res.json(memory);
    } catch (error) {
      console.error("Error updating memory:", error);
      res.status(500).json({ message: "Error updating memory" });
    }
  });

  // Clear specific memory key
  router.delete("/api/memory/:key", async (req: Request, res: Response) => {
    const { key } = req.params;

    try {
      await storage.updateMemory(key, null);
      const memory = await storage.getMemory();
      res.json(memory);
    } catch (error) {
      console.error("Error clearing memory:", error);
      res.status(500).json({ message: "Error clearing memory" });
    }
  });


  app.use(router);
  return app.listen();
}