
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const TRAINING_DATA_DIR = path.join(__dirname, '..', 'training-data', 'voice-samples');
const MAX_DURATION_SECONDS = 30; // 30 second chunks for better processing

/**
 * Split large WAV files into smaller chunks using FFmpeg
 */
export async function splitLargeVoiceSamples() {
  try {
    console.log("Starting voice sample processing...");
    
    // Check if directory exists
    try {
      await fsPromises.access(TRAINING_DATA_DIR);
    } catch (e) {
      console.log(`Voice samples directory doesn't exist: ${TRAINING_DATA_DIR}`);
      return { success: false, message: "Voice samples directory doesn't exist" };
    }

    const files = await fsPromises.readdir(TRAINING_DATA_DIR);
    const voiceFiles = files.filter(file => file.endsWith('.wav') && !file.includes('_chunk_') && !file.includes('_original'));

    if (voiceFiles.length === 0) {
      console.log("No voice samples found to process");
      return { success: false, message: "No voice samples found" };
    }

    console.log(`Found ${voiceFiles.length} voice samples to analyze`);
    const results = [];

    for (const file of voiceFiles) {
      try {
        const filePath = path.join(TRAINING_DATA_DIR, file);
        const stats = await fsPromises.stat(filePath);

        // Get file size in MB
        const fileSizeMB = stats.size / (1024 * 1024);
        console.log(`Analyzing file: ${file} (${fileSizeMB.toFixed(2)}MB)`);

        // For all files, check duration and split if needed
        // This ensures we process all files, not just ones over 8MB
        try {
          // This command gets the duration of the audio file
          const ffprobePath = ffmpegPath?.replace('ffmpeg', 'ffprobe') || 'ffprobe';
          
          console.log(`Executing ffprobe to get duration: ${ffprobePath}`);
          const durationOutput = execSync(
            `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
          ).toString().trim();

          const duration = parseFloat(durationOutput);
          console.log(`File ${file} duration: ${duration.toFixed(2)} seconds`);

          // Split if longer than 30 seconds or larger than 5MB
          if (duration > MAX_DURATION_SECONDS || fileSizeMB > 5) {
            console.log(`File duration: ${duration.toFixed(2)} seconds, splitting into ${MAX_DURATION_SECONDS}-second chunks`);

            // Calculate number of chunks needed
            const numChunks = Math.ceil(duration / MAX_DURATION_SECONDS);

            // Create chunks
            for (let i = 0; i < numChunks; i++) {
              const startTime = i * MAX_DURATION_SECONDS;
              const outputFileName = `${file.replace('.wav', '')}_chunk_${i + 1}.wav`;
              const outputPath = path.join(TRAINING_DATA_DIR, outputFileName);

              // Use FFmpeg to extract the chunk
              console.log(`Creating chunk ${i + 1}/${numChunks} starting at ${startTime}s: ${outputFileName}`);
              execSync(
                `"${ffmpegPath}" -y -i "${filePath}" -ss ${startTime} -t ${MAX_DURATION_SECONDS} -c copy "${outputPath}"`
              );
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
          console.error(`Error processing ${file}:`, error);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }

    console.log(`Successfully processed ${results.length} files`);
    return { success: true, processed: results };
  } catch (error) {
    console.error("Error splitting voice samples:", error);
    return { success: false, error: String(error) };
  }
}
