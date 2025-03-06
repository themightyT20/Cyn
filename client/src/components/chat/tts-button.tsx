import React, { useEffect, useState } from 'react';
import Speech from 'speak-tts';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeOff } from "lucide-react";

interface TTSButtonProps {
  text: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const [speech] = useState(new Speech());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    speech
      .init({
        volume: 1,
        lang: "en-US",
        rate: 1,
        pitch: 1,
        splitSentences: true,
      })
      .then((data: unknown) => {
        console.log("Speech is ready", data);
        setIsInitialized(true);
      })
      .catch((e: unknown) => {
        console.error("An error occurred while initializing speech", e);
      });
  }, []);

  const handleSpeak = () => {
    if (!isInitialized) return;

    if (isSpeaking) {
      speech.cancel();
      setIsSpeaking(false);
    } else {
      speech.speak({
        text,
        queue: false,
        listeners: {
          onstart: () => setIsSpeaking(true),
          onend: () => setIsSpeaking(false),
          onerror: (err: unknown) => {
            console.error("TTS Error:", err);
            setIsSpeaking(false);
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
      disabled={!isInitialized}
      title={isSpeaking ? "Stop speaking" : "Speak message"}
    >
      {isSpeaking ? (
        <VolumeOff className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}