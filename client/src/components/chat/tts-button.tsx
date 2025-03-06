import React, { useEffect, useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';

interface TTSButtonProps {
  text: string;
}

interface Voice {
  voiceId: string;
  sampleCount: number;
  lastUpdated: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [settings, setSettings] = useState({
    voiceId: '',
    rate: 1,
    pitch: 1,
    volume: 1
  });

  // Fetch available trained voices
  const { data: voicesData } = useQuery({
    queryKey: ['/api/tts/voices'],
    queryFn: async () => {
      const response = await fetch('/api/tts/voices');
      if (!response.ok) throw new Error('Failed to fetch voices');
      return response.json();
    }
  });

  useEffect(() => {
    // Cleanup audio element on unmount
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.remove();
      }
    };
  }, [audioElement]);

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
        body: JSON.stringify({
          text,
          voiceId: settings.voiceId,
          settings: {
            rate: settings.rate,
            pitch: settings.pitch,
            volume: settings.volume
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audio.playbackRate = settings.rate;
      audio.volume = settings.volume;

      audio.onended = () => {
        setIsPlaying(false);
        setAudioElement(null);
      };

      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error generating speech:', error);
      // TODO: Show error toast
    }
  };

  const updateSettings = (key: string, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const voices = voicesData?.voices || [];

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={handleSpeak}
          disabled={!settings.voiceId}
          title={isPlaying ? "Stop speaking" : "Speak message"}
        >
          {isPlaying ? (
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
                value={settings.voiceId} 
                onValueChange={(value) => updateSettings('voiceId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice: Voice) => (
                    <SelectItem key={voice.voiceId} value={voice.voiceId}>
                      Voice {voice.voiceId} ({voice.sampleCount} samples)
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