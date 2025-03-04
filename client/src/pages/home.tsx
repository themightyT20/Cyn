import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Home() {
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 1000, // Poll for new messages
    refetchOnWindowFocus: true
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
            src="/cyn.png" 
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
          />
        </div>
      </div>
    </div>
  );
}