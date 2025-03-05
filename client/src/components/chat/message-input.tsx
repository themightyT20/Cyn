import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageInputProps {
  onSend: (content: string) => void;
  isLoading?: boolean;
  onWebSearchClick?: () => void;
  onTrainingDataClick?: () => void;
}

export function MessageInput({ onSend, isLoading, onWebSearchClick, onTrainingDataClick }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage("");
    }
  };

  return (
    <div className="relative flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a]"
          >
            <Plus className="h-5 w-5 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-[#2a2a2a] text-white border-gray-700">
          <DropdownMenuItem 
            className="hover:bg-[#3a3a3a]" 
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-image-generator'))}
          >
            Image Generation
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="hover:bg-[#3a3a3a]"
            onClick={onWebSearchClick}
          >
            Web Search
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="hover:bg-[#3a3a3a]"
            onClick={onTrainingDataClick}
          >
            Training Data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <form onSubmit={handleSubmit} className="flex-1">
        <div className="relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message Cyn"
            className="w-full bg-[#2a2a2a] border-0 text-white h-12 rounded-lg pr-12"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-transparent hover:bg-transparent"
            disabled={isLoading || !message.trim()}
          >
            ↑
          </Button>
        </div>
      </form>
    </div>
  );
}