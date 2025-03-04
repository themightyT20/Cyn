import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Home() {
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"]
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
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center p-4">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Cyn</h1>
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4">
            <img 
              src="/logo.jpg" 
              alt="Cyn Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/96?text=Cyn";
              }}
            />
          </div>
        </div>

        <div className="w-full bg-[#2a2a2a] rounded-lg shadow-xl overflow-hidden">
          <ScrollArea className="h-[500px] p-4">
            {isLoading ? (
              <div className="flex justify-center text-gray-400">
                Loading messages...
              </div>
            ) : messages?.length === 0 ? (
              <div className="text-center text-gray-400">
                Start a conversation...
              </div>
            ) : (
              messages?.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
          </ScrollArea>

          <div className="border-t border-gray-700 p-4 bg-[#232323]">
            <MessageInput 
              onSend={(content) => messageMutation.mutate(content)}
              isLoading={messageMutation.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}