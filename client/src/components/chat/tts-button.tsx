
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Volume2, VolumeOff, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TTSButtonProps {
  text?: string;
}

const TTSButton = ({ text }: TTSButtonProps) => {
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isCheckingVoices, setIsCheckingVoices] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [selectedVoiceSample, setSelectedVoiceSample] = useState<string | null>(null);
  const [voiceSamples, setVoiceSamples] = useState<string[]>([]);
  const { toast } = useToast();
  const hasInitialized = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize TTS when component mounts
  useEffect(() => {
    const initializeTTS = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;
      
      // Check if speech synthesis is supported
      if (!('speechSynthesis' in window)) {
        console.error('Speech synthesis not supported');
        setTtsError('Speech synthesis not supported in this browser');
        return;
      }
      
      // Initialize voices if needed
      if (window.speechSynthesis.getVoices().length === 0) {
        // Firefox needs a little time to initialize voices
        window.speechSynthesis.onvoiceschanged = () => {
          console.log('Voices loaded:', window.speechSynthesis.getVoices().length);
        };
      }

      try {
        // Create audio context
        if (!audioContextRef.current && typeof window !== 'undefined') {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Create audio element for sample playback
        if (!audioRef.current && typeof window !== 'undefined') {
          audioRef.current = new Audio();
          audioRef.current.onended = () => {
            setIsPlaying(false);
          };
          audioRef.current.onerror = (e) => {
            console.error('Audio playback error:', e);
            setIsPlaying(false);
            setTtsError('Error playing audio sample');
            toast({
              title: "Audio Error",
              description: "Failed to play voice sample",
              variant: "destructive"
            });
          };
        }
        
        console.log('Custom audio player is ready');

        // Check if we have voice samples
        await checkVoiceSamples();
      } catch (error) {
        console.error('An error occurred while initializing TTS:', error);
        setTtsError(error instanceof Error ? error.message : String(error));
      }
    };

    initializeTTS();
    
    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      // Cancel any ongoing speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Check voice samples from server
  const checkVoiceSamples = async () => {
    setIsCheckingVoices(true);
    setTtsError(null);

    try {
      const response = await fetch('/api/tts/voices');
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      
      // Check voice sample availability
      let availableSamples: string[] = [];

      if (data.samples && Array.isArray(data.samples)) {
        availableSamples = data.samples.filter(sample => 
          sample.endsWith('.wav') && 
          !sample.includes('_original.wav.bak')
        );
        setVoiceSamples(availableSamples);
        
        // Select the first sample by default
        if (availableSamples.length > 0 && !selectedVoiceSample) {
          setSelectedVoiceSample(availableSamples[0]);
        }
      }

      if (availableSamples.length === 0) {
        setTtsError("No voice samples found. Please upload WAV files to the training-data/voice-samples directory.");
      } else {
        toast({
          title: "Voice samples found",
          description: `Found ${availableSamples.length} voice samples`,
        });
      }
    } catch (error) {
      console.error("Error checking voice samples:", error);
      setTtsError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCheckingVoices(false);
    }
  };

  // Play text using browser's speech synthesis
  const playTextWithSample = async () => {
    if (!text) {
      console.error("Missing text to speak");
      return;
    }
    
    try {
      setIsPlaying(true);
      
      // Use the Web Speech API to speak the text
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      
      // Select a voice (preferably a female voice, as it might sound better)
      const femaleVoices = voices.filter(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.includes('woman') || 
        voice.name.includes('girl')
      );
      
      // Set voice - prefer female voice if available, otherwise use default
      if (femaleVoices.length > 0) {
        utterance.voice = femaleVoices[0];
      } else if (voices.length > 0) {
        utterance.voice = voices[0];
      }
      
      // Adjust speech parameters
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume
      
      // Set event handlers
      utterance.onend = () => {
        console.log("Speech finished");
        setIsPlaying(false);
      };
      
      utterance.onerror = (event) => {
        console.error("Speech error:", event);
        setIsPlaying(false);
        setTtsError(`Speech error: ${event.error}`);
        toast({
          title: "Speech Error",
          description: event.error,
          variant: "destructive"
        });
      };
      
      // Play the speech
      window.speechSynthesis.speak(utterance);
      
      // Log that we're using speech synthesis instead of audio sample
      console.log("Speaking text using browser speech synthesis");
      
    } catch (error) {
      console.error("Error in playTextWithSample:", error);
      setIsPlaying(false);
      setTtsError(`Error playing speech: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const stopAudio = () => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Cancel any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
  };

  const handleSpeak = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playTextWithSample();
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
      
      toast({
        title: "Processing voice samples",
        description: "Splitting large voice samples into smaller chunks...",
      });
      
      const response = await fetch('/api/tts/split-samples', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Voice samples split successfully",
          description: `Split ${data.processed.length} large voice samples into smaller chunks.`,
          variant: "default"
        });
        // Refresh the voice samples list
        setTimeout(() => {
          checkVoiceSamples();
        }, 1000); // Give the server time to finish processing
      } else {
        setTtsError(`Failed to split voice samples: ${data.message}`);
        toast({
          title: "Failed to split samples",
          description: data.message || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error splitting voice samples:", error);
      setTtsError(`Error splitting voice samples: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Error processing samples",
        description: `${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
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
          <div className="flex flex-col">
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
            
            {voiceSamples.length > 0 && (
              <select 
                className="mt-1 text-xs rounded bg-gray-100 dark:bg-gray-800 p-1"
                value={selectedVoiceSample || ''}
                onChange={(e) => setSelectedVoiceSample(e.target.value)}
              >
                {voiceSamples.map(sample => (
                  <option key={sample} value={sample}>
                    {sample.replace('.wav', '').substring(0, 15)}...
                  </option>
                ))}
              </select>
            )}
            
            {!ttsError && isTTSEnabled && (
              <div className="text-xs text-center mt-1 text-gray-500">
                Using browser speech
              </div>
            )}
            {ttsError && (
              <Button 
                onClick={handleSplitSamples} 
                variant="outline" 
                size="sm" 
                className="mt-1 text-xs"
                disabled={isBusy}
              >
                {isBusy ? 'Processing...' : 'Fix Samples'}
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isCheckingVoices 
            ? "Checking voice samples..." 
            : ttsError 
              ? `TTS Error: ${ttsError}` 
              : isTTSEnabled 
                ? "Disable text-to-speech (uses browser speech)" 
                : "Enable text-to-speech (uses browser speech)"}
        </TooltipContent>
      </Tooltip>

      {/* Reset button */}
      {isPlaying && (
        <button 
          className="fixed bottom-2 right-2 bg-red-500 text-white text-xs p-1 rounded opacity-70 hover:opacity-100 z-50"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.src = '';
            }
            setIsPlaying(false);
            
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
          Reset Audio
        </button>
      )}
    </TooltipProvider>
  );
};

export default TTSButton;
export { TTSButton };
