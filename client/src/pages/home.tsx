import React, { useState, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { TrainingDataUpload } from "@/components/chat/training-data-upload";
import { Dialog } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { searchWeb } from "@/lib/api";

const ImageGenerator = lazy(() => import("@/components/chat/image-generate").then(module => ({ default: module.ImageGeneratorComponent })));

export default function Home() {
  const [showTrainingData, setShowTrainingData] = useState(false);
  const [showWebSearch, setShowWebSearch] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      <div className="flex flex-col items-center pt-8 pb-4">
        <h1 className="text-5xl font-bold text-white mb-4">Cyn</h1>
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4">
          <img 
            src="/avatar.png" 
            alt="Cyn"
            className="w-full h-full object-cover border-2 border-yellow-400 glow-effect"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center" onClick={() => setShowTrainingData(false)}>
          <div className="bg-[#2a2a2a] p-6 rounded-lg w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Upload Training Data</h2>
            <TrainingDataUpload onClose={() => setShowTrainingData(false)} />
          </div>
        </div>
      </Dialog>

      {/* Web Search Dialog */}
      <Dialog open={showWebSearch} onOpenChange={setShowWebSearch}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center" onClick={() => setShowWebSearch(false)}>
          <div className="bg-[#2a2a2a] p-6 rounded-lg w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Web Search</h2>
            <div className="text-white">
              Web search functionality coming soon...
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}