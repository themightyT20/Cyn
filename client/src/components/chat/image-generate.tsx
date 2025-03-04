import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function ImageGeneratorComponent() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    imageUrl?: string;
    description?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/generate-image", { prompt });
      const data = await response.json();

      if (data.error) {
        setResult({ error: data.error });
      } else {
        setResult({
          imageUrl: data.imageUrl,
          description: data.description,
          message: data.message
        });
      }
    } catch (error) {
      setResult({ error: "Failed to generate image. Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-[#252525] border-gray-700">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-2">
            <Input
              className="bg-[#333] border-gray-700 text-white"
              placeholder="Describe an image..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>

          {result && (
            <div className="mt-4">
              {result.error ? (
                <div className="text-red-400 text-sm">{result.error}</div>
              ) : (
                <div className="space-y-3">
                  {result.imageUrl && (
                    <div className="flex justify-center">
                      <img 
                        src={result.imageUrl} 
                        alt="Generated" 
                        className="max-w-full h-auto rounded-md"
                      />
                    </div>
                  )}
                  {result.description && (
                    <div className="text-sm text-gray-300 mt-2 max-h-24 overflow-y-auto">
                      <p>{result.description}</p>
                    </div>
                  )}
                  {result.message && (
                    <div className="text-xs text-gray-400 mt-1">
                      <p>{result.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ImageGeneratorComponent;