import React, { useState, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { TrainingDataUpload } from "@/components/chat/training-data-upload";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { searchWeb } from "@/lib/api";

const ImageGenerator = lazy(() => import("@/components/chat/image-generate").then(module => ({ default: module.ImageGeneratorComponent })));

export default function Home() {
  const [showTrainingData, setShowTrainingData] = useState(false);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const messageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        content,
        role: "user",
        metadata: {}
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    }
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      <div className="flex flex-col items-center pt-8 pb-4">
        <h1 className="text-5xl font-bold text-white mb-4">Cyn</h1>
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4">
          <img 
            src="/cyn-avatar.png" 
            alt="Cyn"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
        <ScrollArea className="flex-1 px-2">
          {isLoading ? (
            <div className="text-center text-gray-400 mt-4">
              Loading...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-4">
              No messages yet. Start a conversation!
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4">
          <MessageInput 
            onSend={(content) => messageMutation.mutate(content)}
            isLoading={messageMutation.isPending}
            onWebSearchClick={() => setShowWebSearch(true)}
            onTrainingDataClick={() => setShowTrainingData(true)}
          />
        </div>
      </div>

      {/* Training Data Dialog */}
      <Dialog open={showTrainingData} onOpenChange={setShowTrainingData}>
        <DialogContent className="bg-[#2a2a2a] text-white border-gray-700 p-6">
          <h2 className="text-2xl font-bold mb-4">Upload Training Data</h2>
          <TrainingDataUpload onClose={() => setShowTrainingData(false)} />
        </DialogContent>
      </Dialog>

      {/* Web Search Dialog */}
      <Dialog open={showWebSearch} onOpenChange={setShowWebSearch}>
        <DialogContent className="bg-[#2a2a2a] text-white border-gray-700 p-6">
          <h2 className="text-2xl font-bold mb-4">Web Search</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="flex-1 bg-[#3a3a3a] border-0 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {searchResults.map((result, index) => (
                <div key={index} className="p-4 bg-[#3a3a3a] rounded-lg">
                  <h3 className="font-semibold mb-2">{result.title}</h3>
                  <p className="text-gray-300">{result.snippet}</p>
                  {result.link && (
                    <a 
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm mt-2 block"
                    >
                      Visit Link
                    </a>
                  )}
                </div>
              ))}
              {searchResults.length === 0 && !isSearching && searchQuery && (
                <p className="text-gray-400 text-center">No results found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}