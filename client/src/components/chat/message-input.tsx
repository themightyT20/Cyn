import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image, Search } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string) => void;
  isLoading?: boolean;
}

export function MessageInput({ onSend, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !message.trim()}>
        <Send className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline">
        <Image className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
