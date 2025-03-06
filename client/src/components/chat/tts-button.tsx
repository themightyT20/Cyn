import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Volume2, VolumeOff, AlertCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface TTSButtonProps {
  text?: string;
}

const TTSButton = ({ text }: TTSButtonProps) => {
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isCheckingVoices, setIsCheckingVoices] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [isBusy, setIsBusy] = useState(false); // Added state for button disabling
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
        // Check for large voice samples
        let largeFilesFound = false;
        let largeFileNames = [];

        if (data.fileSizes) {
          Object.entries(data.fileSizes).forEach(([fileName, fileInfo]: [string, any]) => {
            if (fileInfo.isLarge) {
              largeFilesFound = true;
              largeFileNames.push(`${fileName} (${fileInfo.sizeInMB}MB)`);
            }
          });
        }

        if (largeFilesFound) {
          const message = `Warning: Found large voice samples (>10MB): ${largeFileNames.join(', ')}. This may cause issues with speech synthesis. Consider using shorter samples (30-60 seconds).`;
          console.warn(message);
          setTtsError(message);
          toast({
            title: "Large voice samples detected",
            description: "Voice files are too large (>10MB). Try shorter samples (30-60 seconds).",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Voice diagnostic complete",
            description: `Found voice samples: ${hasVoiceSamples ? 'Yes' : 'No'}`,
          });
        }
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

  // Text-to-speech functionality
  useEffect(() => {
    if (!text) return;

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

  const handleSplitSamples = async () => {
    try {
      setIsBusy(true);
      const response = await fetch('/api/tts/split-samples', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Voice samples split successfully",
          description: `Split ${data.processed.length} large voice samples into smaller chunks.`,
        });
        // Refresh the voice samples list
        checkVoiceSamples();
      } else {
        setTtsError(`Failed to split voice samples: ${data.message}`);
      }
    } catch (error) {
      console.error("Error splitting voice samples:", error);
      setTtsError(`Error splitting voice samples: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsBusy(false);
    }
  };

  // If this is being used as a text player button (in message bubble)
  if (text) {
    return (
      <Button
        onClick={handleSpeak}
        size="icon"
        variant="ghost"
        className="h-6 w-6 rounded-full p-0"
      >
        {isPlaying ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // Otherwise this is the main TTS toggle button
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

      {/* Hidden button to force reload TTS engine - debug purposes */}
      {isPlaying && (
        <button 
          className="fixed bottom-2 right-2 bg-red-500 text-white text-xs p-1 rounded opacity-70 hover:opacity-100 z-50"
          onClick={() => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;

            // Clear any cached data
            if (window.caches) {
              caches.keys().then(names => {
                names.forEach(name => {
                  caches.delete(name);
                });
              });
            }

            // Reload the page to reinitialize everything
            window.location.reload();
          }}
        >
          Reset TTS
        </button>
      )}
    </TooltipProvider>
  );
};

export default TTSButton;
export { TTSButton };