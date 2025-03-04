import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { TrainingDataUpload } from "@/components/chat/training-data-upload";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");

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
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
            <TabsTrigger value="training" className="flex-1">Training Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="p-4">
            <ScrollArea className="h-[600px] pr-4">
              {isLoading ? (
                <div className="flex justify-center">Loading messages...</div>
              ) : (
                messages?.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
            </ScrollArea>
            
            <MessageInput 
              onSend={(content) => messageMutation.mutate(content)}
              isLoading={messageMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="training" className="p-4">
            <TrainingDataUpload />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
