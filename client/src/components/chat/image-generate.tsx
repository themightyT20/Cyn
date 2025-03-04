
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateImage } from "@/lib/api";
import { Loader2 } from "lucide-react";

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<{imageUrl?: string, description?: string, message?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError("");
    setResult(null);
    
    try {
      const data = await generateImage(prompt);
      setResult(data);
    } catch (err) {
      setError("Failed to generate image. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 p-4 bg-[#222] rounded-lg">
      <h2 className="text-xl font-semibold text-white">Image Generation</h2>
      
      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          className="flex-1"
        />
        <Button 
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Generate
        </Button>
      </div>
      
      {error && <p className="text-red-400 text-sm">{error}</p>}
      
      {result && (
        <div className="space-y-3">
          {result.imageUrl && (
            <div className="rounded-md overflow-hidden">
              <img 
                src={result.imageUrl} 
                alt={prompt}
                className="w-full h-auto"
              />
            </div>
          )}
          
          {result.description && (
            <div className="text-sm text-gray-300">
              <p>{result.description}</p>
            </div>
          )}
          
          {result.message && (
            <div className="text-sm text-yellow-300">
              <p>{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
