import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn(
      "flex gap-2 mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <Card className={cn(
        "p-4 max-w-[80%]",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <div className="flex items-start gap-2">
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
          <p className="leading-relaxed">{message.content}</p>
        </div>
      </Card>
    </div>
  );
}
