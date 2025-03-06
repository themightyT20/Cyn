import React, { useEffect, useState } from 'react';
import Speech from 'speak-tts';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeOff, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TTSButtonProps {
  text: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const [speech] = useState(new Speech());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState({
    voice: '',
    rate: 1,
    pitch: 1,
    volume: 1
  });

  useEffect(() => {
    speech
      .init({
        volume: settings.volume,
        lang: "en-US",
        rate: settings.rate,
        pitch: settings.pitch,
        splitSentences: true,
      })
      .then((data: unknown) => {
        console.log("Speech is ready", data);
        setIsInitialized(true);
        // Get available voices
        if (window.speechSynthesis) {
          const availableVoices = window.speechSynthesis.getVoices();
          setVoices(availableVoices);
          if (availableVoices.length > 0 && !settings.voice) {
            setSettings(prev => ({ ...prev, voice: availableVoices[0].name }));
          }
        }
      })
      .catch((e: unknown) => {
        console.error("An error occurred while initializing speech", e);
      });

    // Handle dynamic voice loading
    window.speechSynthesis.onvoiceschanged = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
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

  const updateSettings = (key: string, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    speech.setVolume(settings.volume);
    speech.setRate(settings.rate);
    speech.setPitch(settings.pitch);
    if (typeof value === 'string' && key === 'voice') {
      speech.setVoice(value);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
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
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={() => setShowSettings(true)}
          title="TTS Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Text-to-Speech Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select 
                value={settings.voice} 
                onValueChange={(value) => updateSettings('voice', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rate: {settings.rate}x</Label>
              <Slider 
                min={0.5} 
                max={2} 
                step={0.1}
                value={[settings.rate]}
                onValueChange={([value]) => updateSettings('rate', value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pitch: {settings.pitch}</Label>
              <Slider 
                min={0.5} 
                max={2} 
                step={0.1}
                value={[settings.pitch]}
                onValueChange={([value]) => updateSettings('pitch', value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Volume: {Math.round(settings.volume * 100)}%</Label>
              <Slider 
                min={0} 
                max={1} 
                step={0.1}
                value={[settings.volume]}
                onValueChange={([value]) => updateSettings('volume', value)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}