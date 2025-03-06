import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, Upload } from "lucide-react";

interface VoiceTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceTrainingDialog({ open, onOpenChange }: VoiceTrainingDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('/api/tts/upload-sample', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Voice sample uploaded successfully!');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading voice sample:', error);
      alert('Failed to upload voice sample. Please try again.');
    }
  };

  const handleUploadRecording = async () => {
    if (!audioBlob) return;

    const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
    await handleFileUpload(file);
    setAudioBlob(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#242424] border border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-center">Voice Training</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Mic className={`h-8 w-8 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
            <span className="text-sm text-gray-400">
              {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
            </span>
          </div>

          {audioBlob && (
            <div className="flex flex-col items-center gap-2">
              <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
              <Button onClick={handleUploadRecording} className="bg-green-600 hover:bg-green-700">
                Upload Recording
              </Button>
            </div>
          )}

          <div className="border-t border-gray-700 pt-4">
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center">
                <Upload className="h-8 w-8" />
              </div>
              <span className="text-sm text-gray-400">Or upload WAV file</span>
              <input
                type="file"
                accept="audio/wav"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
