import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { TTSButton } from "./tts-button";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn(
      "flex",
      isUser ? "justify-end" : "justify-start",
      "mb-4"
    )}>
      <div className={cn(
        "px-4 py-2 rounded-2xl max-w-[80%] relative group",
        isUser ? "bg-white text-[#1a1a1a]" : "bg-[#daa520] text-[#1a1a1a]"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <TTSButton text={message.content} />
        </div>
      </div>
    </div>
  );
}