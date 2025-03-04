import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageIcon } from "lucide-react";

export const ImageGeneratorComponent = () => {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;

    setLoading(true);
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      setGeneratedImage(data.description || "Image Generation with Gemini 1.5 Flash is text-only. Please integrate with an image generation API for actual images.");
    } catch (error) {
      console.error("Error generating image:", error);
      setGeneratedImage("Error generating image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="p-2 bg-transparent border-none hover:bg-gray-800"
            onClick={() => setIsOpen(true)}
          >
            <img 
              src="/new-avatar.png" 
              alt="Cyn" 
              className="w-10 h-10 rounded-full object-cover border-2 border-yellow-400 glow-effect"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4 bg-[#242424] border border-gray-700 text-white">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Image Generation</h3>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Enter a description to generate an image..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border-gray-700 text-white"
              />
              <Button 
                onClick={handleGenerate} 
                disabled={loading || !prompt}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Generate
              </Button>
            </div>

            {loading && (
              <div className="mt-4 text-center text-gray-400">
                Generating image...
              </div>
            )}

            {generatedImage && !loading && (
              <div className="mt-4">
                <div className="max-w-xl mx-auto bg-[#1a1a1a] p-4 rounded-md">
                  <p className="text-gray-300 whitespace-pre-line">{generatedImage}</p>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};