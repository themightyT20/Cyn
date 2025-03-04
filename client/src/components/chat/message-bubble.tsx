import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Bot, User, Image as ImageIcon, Search } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isImage = message.content.startsWith("[Image Generation Request]") || 
                 message.content.startsWith("[Generated Image URL]");
  const isSearch = message.content.startsWith("[Search Query]") || 
                  message.content.startsWith("[Search Results]");

  const renderContent = () => {
    if (message.content.startsWith("[Generated Image URL]:")) {
      const imageUrl = message.content.replace("[Generated Image URL]:", "").trim();
      return (
        <div className="mt-2">
          <img 
            src={imageUrl} 
            alt="Generated" 
            className="rounded-md max-w-full h-auto"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Generation+Failed";
            }}
          />
        </div>
      );
    }

    if (message.content.startsWith("[Search Results]:")) {
      const results = message.content.replace("[Search Results]:", "").trim();
      return (
        <div className="mt-2 space-y-2">
          {results.split('\n\n').map((result, index) => (
            <div key={index} className="p-2 bg-background/50 rounded">
              {result.split('\n').map((line, i) => (
                <p key={i} className={cn(
                  "text-sm",
                  i === 0 ? "font-semibold" : "",
                  i === 1 ? "text-blue-400 hover:underline" : ""
                )}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return <p className="leading-relaxed">{message.content}</p>;
  };

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
          {isUser ? (
            <User className="h-5 w-5" />
          ) : isImage ? (
            <ImageIcon className="h-5 w-5" />
          ) : isSearch ? (
            <Search className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
          {renderContent()}
        </div>
      </Card>
    </div>
  );
}