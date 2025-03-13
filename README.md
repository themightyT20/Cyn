# Cyn AI Voice Transformation and Cloning Platform

A TypeScript-based AI voice transformation and cloning platform with advanced audio processing capabilities, enabling personalized voice experiences through intelligent machine learning techniques. This application features a chat interface with text-to-speech capabilities, image generation, and web search functionality.

## Key Technologies

- TypeScript frontend with React
- Gemini AI integration
- Express.js backend
- Advanced audio processing
- Machine learning voice cloning
- Multi-modal voice interaction support
- Web Speech API integration for TTS
- DuckDuckGo web search integration
- Image generation with AI

## System Requirements

- Node.js 20.x or higher
- NPM 10.x or higher
- FFMPEG (for audio processing)

## Deployment Instructions for Railway

1. Fork or clone this repository to your GitHub account
2. Create a new Railway project
3. Connect your GitHub repository to Railway
4. Configure the following environment variables:
   - `GEMINI_API_KEY`: Your Google Gemini AI API key
   - `NODE_ENV`: Set to `production`
   - `PORT`: Usually set automatically by Railway, but you can specify if needed
5. Deploy the application
6. Railway will automatically:
   - Install dependencies using package.json
   - Build the application using the build.sh script
   - Start the application using the Procfile
   - Run the production-setup.js file to prepare the directory structure

## Local Development

To run the application locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Production Build

To create a production build:

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## Project Structure

- `/client`: React frontend application
- `/server`: Express.js backend API
- `/shared`: Shared types and schemas
- `/public`: Static assets
- `/training-data`: Voice samples and training data

## Health Check

The application includes a health check endpoint at `/health` that Railway uses to verify the application is running correctly.# Cyn
