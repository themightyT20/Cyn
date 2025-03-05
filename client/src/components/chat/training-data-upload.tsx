import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TrainingDataUploadProps {
  onClose?: () => void;
}

export function TrainingDataUpload({ onClose }: TrainingDataUploadProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training", {
        content,
        category
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Training data uploaded successfully"
      });
      setContent("");
      setCategory("");
      onClose?.();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="mb-2 bg-[#3a3a3a] border-0 text-white"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter training data..."
          rows={10}
          className="bg-[#3a3a3a] border-0 text-white resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <Button 
          variant="outline"
          onClick={onClose}
          className="bg-transparent text-white hover:bg-[#4a4a4a]"
        >
          Cancel
        </Button>
        <Button 
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !content.trim() || !category.trim()}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Upload Training Data
        </Button>
      </div>
    </div>
  );
}