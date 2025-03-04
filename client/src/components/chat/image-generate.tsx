import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";

export const ImageGeneratorComponent = () => {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Listen for the custom event to open the image generator
  useEffect(() => {
    const handleToggleImageGenerator = () => {
      setIsOpen(true);
    };
    
    window.addEventListener('toggle-image-generator', handleToggleImageGenerator);
    
    return () => {
      window.removeEventListener('toggle-image-generator', handleToggleImageGenerator);
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt) return;

    setLoading(true);
    setGeneratedImage(null);
    
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
      // Store the whole response data
      setGeneratedImage(data);
    } catch (error) {
      console.error("Error generating image:", error);
      setGeneratedImage({
        success: false,
        description: "Error generating image. Please try again.",
        imageUrl: "https://placehold.co/600x400?text=Error+Generating+Image",
        message: "An error occurred during image generation."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-[#242424] border border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-center">Image Generator</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
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
                <ImageIcon className="h-4 w-4 mr-2" />
                Generate Image
              </Button>
            </div>

            {loading && (
              <div className="mt-6 text-center text-gray-400 py-8">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <div>Generating image...</div>
                </div>
              </div>
            )}

            {generatedImage && !loading && (
              <div className="mt-4">
                <div className="text-center mb-4">
                  <img 
                    src={generatedImage.imageUrl || "https://placehold.co/600x400?text=AI+Image+Placeholder"} 
                    alt="Generated Image" 
                    className="mx-auto rounded-md border border-gray-700 max-w-full" 
                  />
                  {generatedImage.message && (
                    <p className="text-xs text-amber-400 mt-2">{generatedImage.message}</p>
                  )}
                </div>
                <div className="max-w-full mx-auto bg-[#1a1a1a] p-4 rounded-md">
                  <h4 className="text-md font-medium mb-2 text-gray-200">Generated Description:</h4>
                  <p className="text-gray-300 whitespace-pre-line">{generatedImage.description || "No description available"}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};