import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
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
            className="rounded-lg max-w-full h-auto"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Generation+Failed";
            }}
          />
        </div>
      );
    }

    if (message.content.startsWith("[Search Results]:")) {
      const results = message.content.replace("[Search Results]:", "").trim();
      try {
        const parsedResults = JSON.parse(results);
        return (
          <div className="mt-2 space-y-2">
            {parsedResults.webResults?.slice(0, 3).map((result: any, index: number) => (
              <div key={index} className="p-3 bg-[#1a1a1a] rounded-lg">
                <a 
                  href={result.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block hover:opacity-80"
                >
                  <h3 className="text-blue-400 font-medium mb-1">{result.title}</h3>
                  <p className="text-sm text-gray-400">{result.snippet}</p>
                </a>
              </div>
            ))}
            {parsedResults.youtubeResults?.slice(0, 2).map((video: any, index: number) => (
              <div key={`yt-${index}`} className="p-3 bg-[#1a1a1a] rounded-lg">
                <a 
                  href={`https://youtube.com/watch?v=${video.videoId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block hover:opacity-80"
                >
                  <h3 className="text-red-400 font-medium mb-1">
                    <IconYoutube className="inline-block mr-2 h-4 w-4" />
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-400">{video.description}</p>
                </a>
              </div>
            ))}
          </div>
        );
      } catch (e) {
        return <p className="text-gray-400">{results}</p>;
      }
    }

    return <p className="text-gray-200">{message.content}</p>;
  };

  return (
    <div className={cn(
      "flex items-start gap-3 mb-4 px-2",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-blue-500" : "bg-gray-700"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : isImage ? (
          <ImageIcon className="h-4 w-4 text-white" />
        ) : isSearch ? (
          <Search className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      <div className={cn(
        "px-4 py-2 rounded-2xl max-w-[80%]",
        isUser ? "bg-blue-500 text-white" : "bg-[#2a2a2a]"
      )}>
        {renderContent()}
      </div>
    </div>
  );
}

function IconYoutube({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor"
      className={className}
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}