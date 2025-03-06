import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  text: string;
  className?: string;
}

export function TTSButton({ text, className }: TTSButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceSamples, setVoiceSamples] = useState<string[]>([]);
  const [selectedVoiceSample, setSelectedVoiceSample] = useState<string>("");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isCheckingVoices, setIsCheckingVoices] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Create audio element on component mount
  useEffect(() => {
    audioRef.current = new Audio();

    // Event handlers for audio
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.onerror = (e) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Could not play audio. Try again or choose another voice sample.",
        variant: "destructive"
      });
    };

    // Initial check for voice samples
    checkVoiceSamples();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check for available voice samples
  const checkVoiceSamples = async () => {
    setIsCheckingVoices(true);
    setTtsError(null);

    try {
      const response = await fetch('/api/tts/voices');
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      console.log("Voice samples response:", data);

      if (data.success) {
        const availableSamples = Array.isArray(data.samples) ? data.samples : [];
        setVoiceSamples(availableSamples);

        // Select the first sample by default if none is selected
        if (availableSamples.length > 0 && !selectedVoiceSample) {
          console.log(`Auto-selecting first sample: ${availableSamples[0]}`);
          setSelectedVoiceSample(availableSamples[0]);
        } else if (availableSamples.length > 0) {
          // Ensure the selected sample is in the available list
          if (!availableSamples.includes(selectedVoiceSample)) {
            console.log(`Previously selected sample ${selectedVoiceSample} not found, selecting ${availableSamples[0]}`);
            setSelectedVoiceSample(availableSamples[0]);
          } else {
            console.log(`Continuing with selected sample: ${selectedVoiceSample}`);
          }
        }
      }

      const hasVoiceSamples = data.samples && data.samples.length > 0;

      // Display file info for better debugging
      if (data.fileInfo && Array.isArray(data.fileInfo)) {
        console.log("Voices loaded:", data.fileInfo.length);
      }

      if (!hasVoiceSamples) {
        setTtsError("No voice samples found. Please upload WAV files to the training-data/voice-samples directory.");
      } else {
        toast({
          title: "Voice samples detected",
          description: `Found ${data.samples.length} voice samples ready to use`,
        });
      }
    } catch (error) {
      console.error("Error checking voice samples:", error);
      setTtsError(`Error checking voice samples: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Voice Check Failed",
        description: `${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsCheckingVoices(false);
    }
  };

  // Split large voice samples into smaller chunks
  const splitVoiceSamples = async () => {
    setIsBusy(true);
    setTtsError(null);

    try {
      const response = await fetch('/api/tts/split-samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
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

  // Handle speak button click
  const handleSpeak = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (!selectedVoiceSample) {
      toast({
        title: "No voice sample selected",
        description: "Please select a voice sample first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTtsError(null);

    try {
      // Use server TTS endpoint instead of browser TTS
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceSample: selectedVoiceSample
        }),
      });

      // Check if the response is valid before trying to parse it
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const data = await response.json();
      console.log("TTS response:", data);

      if (data.success && data.audioUrl) {
        // Add a timestamp to bust cache
        const cacheBuster = `?t=${Date.now()}`;
        const audioUrl = `${data.audioUrl}${cacheBuster}`;

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play()
            .catch(err => {
              console.error("Error playing audio:", err);
              toast({
                title: "Playback Error",
                description: `Failed to play audio: ${err.message}`,
                variant: "destructive"
              });
            });
        }
      } else {
        throw new Error(data.message || "Failed to generate speech");
      }
    } catch (error) {
      console.error("TTS error:", error);
      setTtsError(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Speech Generation Failed",
        description: `${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex gap-2 items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSpeak}
          disabled={isLoading || isCheckingVoices || !selectedVoiceSample}
          className="flex items-center"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : null}
          {isPlaying ? "Stop" : "Speak"}
        </Button>

        <div className="flex-1">
          {selectedVoiceSample ? (
            <div className="text-xs opacity-70 truncate">
              Using: {selectedVoiceSample.replace(/_/g, ' ').replace('.wav', '')}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {voiceSamples.length === 0 ? "No voice samples found" : "Select a voice sample"}
            </div>
          )}
        </div>
      </div>

      {ttsError && (
        <div className="text-xs text-red-500 mt-1">{ttsError}</div>
      )}

      <div className="mt-2">
        <div className="flex flex-col space-y-2">
          <Button 
            size="sm" 
            variant="secondary" 
            className="w-full"
            onClick={checkVoiceSamples}
            disabled={isCheckingVoices}
          >
            {isCheckingVoices ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : "Check Voice Samples"}
          </Button>

          {voiceSamples.length > 0 && (
            <>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medium">Select Voice Sample:</label>
                <select 
                  className="w-full px-2 py-1 rounded text-sm bg-background border"
                  value={selectedVoiceSample || ''}
                  onChange={(e) => setSelectedVoiceSample(e.target.value)}
                >
                  <option value="">Select a sample</option>
                  {voiceSamples.map(sample => (
                    <option key={sample} value={sample}>
                      {sample}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={splitVoiceSamples}
                disabled={isBusy}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Split Large Samples"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}