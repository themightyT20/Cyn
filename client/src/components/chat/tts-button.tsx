import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeOff } from "lucide-react";

interface TTSButtonProps {
  text: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audio = new Audio(URL.createObjectURL(await response.blob()));

      audio.onended = () => {
        setIsPlaying(false);
        setAudioElement(null);
      };

      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error generating speech:', error);
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