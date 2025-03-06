import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeOff } from "lucide-react";
import Speech from 'speak-tts';

interface TTSButtonProps {
  text: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speech, setSpeech] = useState<Speech>();

  useEffect(() => {
    const speechInstance = new Speech();
    speechInstance
      .init({
        volume: 1,
        lang: "en-US",
        rate: 1,
        pitch: 1,
        voice: 'Samantha',
        splitSentences: true,
      })
      .then(() => {
        setSpeech(speechInstance);
      })
      .catch(e => {
        console.error("An error occurred while initializing TTS:", e);
      });
  }, []);

  const handleSpeak = () => {
    if (!speech) return;

    if (isPlaying) {
      speech.cancel();
      setIsPlaying(false);
    } else {
      speech.speak({
        text,
        queue: false,
        listeners: {
          onstart: () => setIsPlaying(true),
          onend: () => setIsPlaying(false),
          onerror: (err) => {
            console.error("TTS Error:", err);
            setIsPlaying(false);
          },
        },
      });
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