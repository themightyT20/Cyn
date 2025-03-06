import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  text: string;
  className?: string;
}

export function TTSButton({ text, className }: TTSButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeechSynthesisSupported, setIsSpeechSynthesisSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const { toast } = useToast();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if speech synthesis is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSpeechSynthesisSupported(true);

      // Load available voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);

          // Select a default voice (preferably a female English voice)
          const femaleVoice = availableVoices.find(
            voice => voice.name.includes('female') || 
                    voice.name.includes('Samantha') || 
                    voice.name.includes('Google UK English Female')
          );

          const englishVoice = availableVoices.find(
            voice => voice.lang.includes('en-')
          );

          // Set default voice preference
          setSelectedVoice(femaleVoice || englishVoice || availableVoices[0]);
        }
      };

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      loadVoices();

      // Cleanup
      return () => {
        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
        }
      };
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  }, []);

  const handlePlay = async () => {
    if (!isSpeechSynthesisSupported) {
      toast({
        title: "Not Supported",
        description: "Speech synthesis is not supported in your browser.",
        variant: "destructive"
      });
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    try {
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Set voice if available
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Adjust settings for better speech
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Event handlers
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        setIsLoading(false);
        toast({
          title: "Speech Error",
          description: "An error occurred during speech synthesis.",
          variant: "destructive"
        });
        utteranceRef.current = null;
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoading(false);
      toast({
        title: "Speech Failed",
        description: "Failed to generate speech.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={handlePlay}
      title={isPlaying ? "Stop speaking" : "Speak text"}
      disabled={!text || isLoading || !isSpeechSynthesisSupported}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className={`h-4 w-4 ${isPlaying ? 'text-green-500' : ''}`} />
      )}
    </Button>
  );
}