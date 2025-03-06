import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const TRAINING_DATA_DIR = path.join(__dirname, '..', 'training-data', 'voice-samples');
const MAX_DURATION_SECONDS = 60; // 1 minute chunks

/**
 * Split large WAV files into smaller chunks using FFmpeg
 */
export async function splitLargeVoiceSamples() {
  try {
    // Check if directory exists
    try {
      await fsPromises.access(TRAINING_DATA_DIR);
    } catch (e) {
      console.log(`Voice samples directory doesn't exist: ${TRAINING_DATA_DIR}`);
      return { success: false, message: "Voice samples directory doesn't exist" };
    }

    const files = await fsPromises.readdir(TRAINING_DATA_DIR);
    const voiceFiles = files.filter(file => file.endsWith('.wav') && !file.includes('_chunk_'));

    if (voiceFiles.length === 0) {
      console.log("No voice samples found to process");
      return { success: false, message: "No voice samples found" };
    }

    const results = [];

    for (const file of voiceFiles) {
      try {
        const filePath = path.join(TRAINING_DATA_DIR, file);
        const stats = await fsPromises.stat(filePath);

        // Get file size in MB
        const fileSizeMB = stats.size / (1024 * 1024);

        // If file is larger than 8MB, it's likely longer than 1 minute
        if (fileSizeMB > 8) {
          console.log(`Processing large file: ${file} (${fileSizeMB.toFixed(2)}MB)`);

          // Get duration using FFmpeg
          try {
            // This command gets the duration of the audio file
            const ffprobePath = ffmpegPath?.replace('ffmpeg', 'ffprobe') || 'ffprobe';
            const durationOutput = execSync(
              `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
            ).toString().trim();

            const duration = parseFloat(durationOutput);

            if (duration > MAX_DURATION_SECONDS) {
              console.log(`File duration: ${duration.toFixed(2)} seconds, splitting into ${MAX_DURATION_SECONDS}-second chunks`);

              // Calculate number of chunks needed
              const numChunks = Math.ceil(duration / MAX_DURATION_SECONDS);

              // Create chunks
              for (let i = 0; i < numChunks; i++) {
                const startTime = i * MAX_DURATION_SECONDS;
                const outputFileName = `${file.replace('.wav', '')}_chunk_${i + 1}.wav`;
                const outputPath = path.join(TRAINING_DATA_DIR, outputFileName);

                // Use FFmpeg to extract the chunk
                execSync(
                  `"${ffmpegPath}" -y -i "${filePath}" -ss ${startTime} -t ${MAX_DURATION_SECONDS} -c copy "${outputPath}"`
                );

                console.log(`Created chunk ${i + 1}/${numChunks}: ${outputFileName}`);
              }

              // Rename original file to indicate it's been processed
              const originalBackupName = `${file.replace('.wav', '')}_original.wav.bak`;
              const originalBackupPath = path.join(TRAINING_DATA_DIR, originalBackupName);

              // Move original file to backup name
              await fsPromises.rename(filePath, originalBackupPath);
              console.log(`Backed up original file to ${originalBackupName}`);

              results.push({
                file,
                originalSize: `${fileSizeMB.toFixed(2)}MB`,
                duration: `${duration.toFixed(2)} seconds`,
                chunks: numChunks,
                backupPath: originalBackupPath
              });
            } else {
              console.log(`File duration: ${duration.toFixed(2)} seconds, no splitting needed`);
            }
          } catch (error) {
            console.error(`Error getting duration for ${file}:`, error);
          }
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }

    console.log(`Processed ${results.length} large files`);
    return { success: true, processed: results };
  } catch (error) {
    console.error("Error splitting voice samples:", error);
    return { success: false, error: String(error) };
  }
}