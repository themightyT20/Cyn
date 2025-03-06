import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeOff, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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


const TTSButton = () => {
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isCheckingVoices, setIsCheckingVoices] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const { toast } = useToast();
  const hasInitialized = useRef(false);

  // Check voice samples from server
  const checkVoiceSamples = async () => {
    setIsCheckingVoices(true);
    setTtsError(null);

    try {
      const response = await fetch('/api/tts/debug');
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setDiagnosticInfo(data);

      // Check voice sample availability
      let hasVoiceSamples = false;

      if (data.diagnosticResults) {
        Object.values(data.diagnosticResults).forEach((dir: any) => {
          if (dir.voiceFiles && dir.voiceFiles.length > 0) {
            hasVoiceSamples = true;
          }
        });
      }

      if (!hasVoiceSamples) {
        setTtsError("No voice samples found. Please upload WAV files to the training-data/voice-samples directory.");
      } else {
        toast({
          title: "Voice diagnostic complete",
          description: `Found voice samples: ${hasVoiceSamples ? 'Yes' : 'No'}`,
        });
      }
    } catch (error) {
      console.error("Error checking voice samples:", error);
      setTtsError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCheckingVoices(false);
    }
  };

  // Initialize TTS when component mounts
  useEffect(() => {
    const initializeTTS = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        // Check if Speech Synthesis is available
        if (!('speechSynthesis' in window)) {
          setTtsError('Text-to-speech not supported in this browser');
          return;
        }

        console.log('Speech is ready');

        // Check if we have voice samples
        await checkVoiceSamples();
      } catch (error) {
        console.error('An error occurred while initializing TTS:', error);
        setTtsError(error instanceof Error ? error.message : String(error));
      }
    };

    initializeTTS();
  }, []);

  const toggleTTS = () => {
    // If there's an error, run diagnostics instead of toggling
    if (ttsError) {
      checkVoiceSamples();
      return;
    }

    setIsTTSEnabled(!isTTSEnabled);
    toast({
      title: !isTTSEnabled ? "Text-to-speech enabled" : "Text-to-speech disabled",
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex">
            <Button
              onClick={toggleTTS}
              size="icon"
              variant="ghost"
              disabled={isCheckingVoices}
            >
              {isCheckingVoices ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : ttsError ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : isTTSEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeOff className="h-5 w-5" />
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isCheckingVoices 
            ? "Checking voice samples..." 
            : ttsError 
              ? `TTS Error: ${ttsError}` 
              : isTTSEnabled 
                ? "Disable text-to-speech" 
                : "Enable text-to-speech"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TTSButton;