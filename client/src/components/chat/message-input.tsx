import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={handleSubmit} className="relative">
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
    </form>
  );
}