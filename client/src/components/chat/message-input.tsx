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
      const results = response.items?.slice(0, 3).map((item: any) => 
        `${item.title}\n${item.link}\n${item.snippet}`
      ).join('\n\n');
      onSend(`[Search Results]:\n${results || 'No results found'}`);
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
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isLoading || isGeneratingImage || isSearching}
      />
      <Button 
        type="submit" 
        disabled={isLoading || isGeneratingImage || isSearching || !message.trim()}
      >
        <Send className="h-4 w-4" />
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        onClick={handleImageGeneration}
        disabled={isLoading || isGeneratingImage || isSearching || !message.trim()}
      >
        <Image className="h-4 w-4" />
      </Button>
      <Button 
        type="button" 
        variant="outline"
        onClick={handleSearch}
        disabled={isLoading || isGeneratingImage || isSearching || !message.trim()}
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}