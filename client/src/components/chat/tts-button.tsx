import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TTSButtonProps {
  text: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Create utterance instance
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.lang = 'en-US';
    newUtterance.rate = 1;
    newUtterance.pitch = 1;
    newUtterance.volume = 1;

    // Add event listeners
    newUtterance.onend = () => setIsPlaying(false);
    newUtterance.onerror = (event) => {
      console.error('TTS Error:', event);
      setIsPlaying(false);
      toast({
        title: "Speech Error",
        description: "Could not play text-to-speech",
        variant: "destructive"
      });
    };

    setUtterance(newUtterance);

    // Cleanup
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text]);

  const handleSpeak = () => {
    if (!utterance) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Ensure we're starting fresh
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      onClick={handleSpeak}
      title={isPlaying ? "Stop speaking" : "Speak message"}
    >
      {isPlaying ? (
        <VolumeOff className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}