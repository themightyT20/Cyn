import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Volume2, AlertCircle, RefreshCw, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TTSButtonProps {
  text?: string;
}

const TTSButton = ({ text }: TTSButtonProps) => {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [hasCheckedVoices, setHasCheckedVoices] = useState(false);
  const [voiceSamples, setVoiceSamples] = useState<string[]>([]);
  const [selectedVoiceSample, setSelectedVoiceSample] = useState<string | null>(null);
  const [isCheckingVoices, setIsCheckingVoices] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);
  const { toast } = useToast();

  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioPlayerRef = useRef<{
    play: (text: string, playTime: number) => Promise<void>,
    stop: () => void,
    isPaused: boolean,
    togglePause: () => void
  } | null>(null);

  // Check if speech synthesis is available
  const isSpeechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Initialize custom audio player that uses voice samples to simulate speaking
  const initializeCustomPlayer = () => {
    if (audioPlayerRef.current) return;

    audioPlayerRef.current = {
      isPaused: false,

      async play(text: string, playTime: number) {
        // If no voice sample is selected, try to select one automatically
        if (!selectedVoiceSample && voiceSamples.length > 0) {
          setSelectedVoiceSample(voiceSamples[0]);
          console.log(`Auto-selected voice sample: ${voiceSamples[0]}`);
        }
        
        if (!selectedVoiceSample) {
          // Fallback to browser's built-in TTS if no sample is available
          console.log("No voice sample available, using browser TTS");
          return useBrowserTTS(text);
        }

        try {
          // Create new audio element if needed
          if (!audioRef.current) {
            audioRef.current = new Audio();
          }

          // Set the source to the selected voice sample
          const sampleUrl = `/training-data/voice-samples/${selectedVoiceSample}`;
          audioRef.current.src = sampleUrl;

          // Determine speaking duration based on text length
          // A rough estimate: average reading speed is ~150 words per minute
          // That's about 2.5 words per second
          const words = text.split(' ').length;
          const estimatedDuration = Math.max(3, words / 2.5); // At least 3 seconds, or longer based on words

          console.log(`Speaking text (${words} words, ~${estimatedDuration.toFixed(1)}s): "${text}" using sample: ${selectedVoiceSample}`);
          toast({
            title: "Speaking",
            description: text.length > 60 ? text.substring(0, 57) + "..." : text,
            duration: estimatedDuration * 1000
          });

          // Play the audio with better error handling
          try {
            await audioRef.current.play();
            setSpeaking(true);
            
            // Add an error event listener if not already added
            if (!audioRef.current.onended) {
              audioRef.current.onended = () => {
                setSpeaking(false);
                console.log("Voice sample playback ended");
              };
              
              audioRef.current.onerror = (e) => {
                console.error("Audio playback error:", e);
                setSpeaking(false);
                // Fallback to browser TTS if sample playback fails
                useBrowserTTS(text);
              };
            }
          } catch (playError) {
            console.error("Failed to play voice sample:", playError);
            // Fallback to browser TTS if sample playback fails
            return useBrowserTTS(text);
          }

          // Set a timeout to stop playing after the calculated time
          // Use the estimated duration based on text length rather than fixed time
          setTimeout(() => {
            if (audioRef.current && !this.isPaused) {
              audioRef.current.pause();
              setSpeaking(false);
            }
          }, estimatedDuration * 1000);
        } catch (error) {
          console.error("Error using voice sample for speech:", error);
          setSpeaking(false);
          throw error;
        }
      },

      stop() {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        this.isPaused = false;
        setSpeaking(false);
      },

      togglePause() {
        if (!audioRef.current) return;

        if (this.isPaused) {
          audioRef.current.play();
          this.isPaused = false;
          setPaused(false);
        } else {
          audioRef.current.pause();
          this.isPaused = true;
          setPaused(true);
        }
      }
    };

    console.log("Custom audio player is ready");
  };

  const initializeTTS = () => {
    if (!isSpeechAvailable && !useBrowserTTS) {
      setTtsError("Speech synthesis is not supported in your browser");
      return;
    }

    console.log("Speech is ready");

    // Initialize the custom player
    initializeCustomPlayer();

    // Check for voice samples on initialization
    if (!hasCheckedVoices) {
      checkVoiceSamples();
      setHasCheckedVoices(true);
    }
  };

  useEffect(() => {
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
        // Filter for valid samples
        availableSamples = data.samples.filter(sample => 
          sample.endsWith('.wav') && 
          !sample.includes('_original.wav.bak')
        );
        
        console.log(`Found ${availableSamples.length} valid voice samples`);
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

      const hasVoiceSamples = availableSamples.length > 0;

      // Display file info for better debugging
      if (data.fileInfo && Array.isArray(data.fileInfo)) {
        console.log("Voices loaded:", data.fileInfo.length);
      }

      if (!hasVoiceSamples) {
        setTtsError("No voice samples found. Please upload WAV files to the training-data/voice-samples directory.");
      } else {
        toast({
          title: "Voice samples detected",
          description: `Found ${availableSamples.length} voice samples ready to use`,
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

  // Function to use server-side TTS with voice samples
  const useServerTTS = async (text: string) => {
    // If no voice sample is selected but we have samples available, select the first one
    if (!selectedVoiceSample && voiceSamples.length > 0) {
      setSelectedVoiceSample(voiceSamples[0]);
      console.log(`Auto-selected voice sample: ${voiceSamples[0]}`);
    } else if (!selectedVoiceSample) {
      console.log("No voice sample available, using browser TTS");
      return useBrowserTTS(text);
    }

    try {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceSample: selectedVoiceSample
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to process speech");
      }

      // Create new audio element if needed
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Play the returned audio
      audioRef.current.src = data.audioUrl;
      await audioRef.current.play();
      setSpeaking(true);

      // Use the estimated duration from the server
      const duration = data.metadata?.duration || 5;

      // Show toast with the text being spoken
      toast({
        title: "Speaking with your voice",
        description: text.length > 60 ? text.substring(0, 57) + "..." : text,
        duration: duration * 1000
      });

      // Set a timeout to stop playing
      setTimeout(() => {
        if (audioRef.current && !audioPlayerRef.current?.isPaused) {
          audioRef.current.pause();
          setSpeaking(false);
        }
      }, duration * 1000);

    } catch (error) {
      console.error("Error with server TTS:", error);
      throw error;
    }
  };

  // Speak the text
  const speak = async () => {
    // Handle pause/resume if already speaking
    if (speaking) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.togglePause();
        return;
      } else if (isSpeechAvailable) {
        if (paused) {
          window.speechSynthesis.resume();
          setPaused(false);
        } else {
          window.speechSynthesis.pause();
          setPaused(true);
        }
        return;
      }
    }

    // First check if we have voice samples available
    if (voiceSamples.length === 0) {
      await checkVoiceSamples();

      if (voiceSamples.length === 0) {
        setTtsError("No voice samples available. Please upload WAV files to use custom voices.");

        // Fall back to browser TTS if no samples are available
        if (isSpeechAvailable && useBrowserTTS) {
          useBrowserSpeech();
        } else {
          toast({
            title: "Voice Samples Missing",
            description: "Please upload voice samples to the training-data/voice-samples directory",
            variant: "destructive"
          });
        }
        return;
      }
    }

    try {
      // Use custom audio player with voice samples
      if (audioPlayerRef.current && selectedVoiceSample) {
        try {
          await audioPlayerRef.current.play(text, 5);
        } catch (error) {
          console.error("Error with custom player:", error);
          // Fall back to browser speech if custom player fails
          if (isSpeechAvailable && useBrowserTTS) {
            useBrowserSpeech();
          } else {
            throw error;
          }
        }
      } else if (isSpeechAvailable && useBrowserTTS) {
        useBrowserSpeech();
      } else {
        throw new Error("No speech method available");
      }
    } catch (error) {
      console.error("Error initializing speech:", error);
      setTtsError(`Error initializing speech: ${error instanceof Error ? error.message : String(error)}`);

      toast({
        title: "Speech Error",
        description: `${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  };

  // Fallback to browser speech synthesis
  const useBrowserSpeech = () => {
    if (!isSpeechAvailable) {
      setTtsError("Speech synthesis is not supported in your browser");
      return;
    }

    console.log("Speaking text using browser speech synthesis");

    try {
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Get available voices
      const voices = window.speechSynthesis.getVoices();

      // Try to find a good default voice
      let selectedVoice;

      // First try to find a female UK or US voice
      selectedVoice = voices.find(voice => 
        (voice.name.includes('UK') || voice.name.includes('US')) && 
        voice.name.toLowerCase().includes('female')
      );

      // If not found, look for just female
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('female')
        );
      }

      // If still not found, look for UK or US voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.name.includes('UK') || voice.name.includes('US')
        );
      }

      // Use the first available voice as a fallback
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Set properties
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Add event listeners
      utterance.onstart = () => {
        setSpeaking(true);
      };

      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        console.log("Speech finished");
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setSpeaking(false);
        setPaused(false);
        setTtsError(`Speech synthesis error: ${event.error}`);

        toast({
          title: "Speech Error",
          description: `${event.error}`,
          variant: "destructive"
        });
      };

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Start speaking
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error in browser speech:", error);
      throw error;
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    // Stop custom audio player if active
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }

    // Also stop browser speech synthesis if active
    if (isSpeechAvailable) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
    setPaused(false);
  };

  // If this is being used as a text player button (in message bubble)
  if (text) {
    return (
      <Button
        onClick={speak}
        size="icon"
        variant="ghost"
        className="h-6 w-6 rounded-full p-0"
      >
        {speaking ? (
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
              onClick={speak}
              size="icon"
              variant="ghost"
              disabled={isCheckingVoices}
            >
              {isCheckingVoices ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : ttsError ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : speaking ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

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
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
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
                      {voiceSamples.map(sample => (
                        <option key={sample} value={sample}>
                          {sample}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="w-full"
                    onClick={splitVoiceSamples}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : "Split Large Samples"}
                  </Button>

                  <div className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      id="use-browser-tts"
                      checked={useBrowserTTS}
                      onChange={() => setUseBrowserTTS(!useBrowserTTS)}
                      className="rounded"
                    />
                    <label htmlFor="use-browser-tts">Fallback to browser TTS</label>
                  </div>
                </>
              )}
            </div>

            {ttsError && (
              <div className="text-red-500 text-xs mt-1">{ttsError}</div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isCheckingVoices 
            ? "Checking voice samples..." 
            : ttsError 
              ? `TTS Error: ${ttsError}` 
              : speaking
                ? "Stop speaking"
                : "Speak"}
        </TooltipContent>
      </Tooltip>

      {/* Reset button */}
      {speaking && (
        <button 
          className="fixed bottom-2 right-2 bg-red-500 text-white text-xs p-1 rounded opacity-70 hover:opacity-100 z-50"
          onClick={stopSpeaking}
        >
          Stop
        </button>
      )}
    </TooltipProvider>
  );
};

export default TTSButton;
export { TTSButton };