# Voice Training Data

This directory contains the voice samples used for training the TTS system.

## Structure

Place your WAV files directly in this directory using the following format:
```
training-data/voice-samples/
  ├── sample1.wav
  ├── sample2.wav
  └── sample3.wav
```

## Requirements

- Files must be WAV format
- Audio should be clear and high quality
- Each file should contain a single voice
- **Recommended length: 30-60 seconds per sample** (maximum 2 minutes)
- **Maximum file size: 10MB** (larger files may cause issues)
- Multiple samples are recommended for better results

## How to Add Voice Samples

1. Create your WAV recordings (recommended: 44.1kHz, 16-bit)
2. Name them descriptively (e.g., `voice_sample_1.wav`)
3. Place the files directly in this directory
4. The system will automatically detect and use these samples

Note: Ensure your audio files are properly formatted WAV files with headers. The system validates files before using them.
