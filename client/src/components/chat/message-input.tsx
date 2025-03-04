import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image, Search } from "lucide-react";
import { generateImage, searchWeb } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MessageInputProps {
  onSend: (content: string) => void;
  isLoading?: boolean;
}

export function MessageInput({ onSend, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage("");
    }
  };

  const handleImageGeneration = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter an image description",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingImage(true);
      const response = await generateImage(message);
      onSend(`[Image Generation Request]: ${message}`);
      onSend(`[Generated Image URL]: ${response.imageUrl}`);
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate image",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSearch = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSearching(true);
      const response = await searchWeb(message);
      onSend(`[Search Query]: ${message}`);
      onSend(`[Search Results]:\n${JSON.stringify(response, null, 2)}`);
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 relative">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message Cyn..."
          className="bg-[#1a1a1a] border-gray-700 text-white pr-24"
          disabled={isLoading || isGeneratingImage || isSearching}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleImageGeneration}
            disabled={isLoading || isGeneratingImage || isSearching || !message.trim()}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <Image className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleSearch}
            disabled={isLoading || isGeneratingImage || isSearching || !message.trim()}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={isLoading || isGeneratingImage || isSearching || !message.trim()}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}