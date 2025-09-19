# Chat VRD - Video Requirements Document Assistant

<!-- Vercel GitHub integration test - Connection test at 2025-09-19 12:59 - Ready for deployment -->

A multimodal, speech-enabled AI assistant built with React 19, TypeScript, and Vite that helps users create comprehensive Video Requirements Documents (VRDs) through an adaptive discovery process.

## 🚀 Features

- **Multimodal Chat Interface** - Text input with file attachments (images, videos, audio, documents)
- **Text-to-Speech Integration** - Built-in speech synthesis for AI responses
- **Adaptive Discovery Engine** - Adjusts guidance level based on user expertise (1-10 clarity scale)
- **YouTube Integration** - Automatic video URL detection and content analysis
- **Desktop Integration** - Native desktop launcher with process management
- **Streaming AI Responses** - Real-time responses from Google Gemini AI

## 📋 Prerequisites

- **Node.js** 18+ (recommended 20+)
- **npm** or **yarn**
- **Google Gemini API Key**

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the project root:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🎯 Available Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
```

### Desktop Integration (Linux)
```bash
./launch-kijko.sh    # Launch app with desktop integration
./kill-kijko.sh      # Stop app and free all ports
```

## 🏗️ Architecture

### Core Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6.2.0
- **AI Integration**: Google Gemini API (@google/genai)
- **Speech**: Web Speech API for text-to-speech

### Key Components
- **Adaptive AI System**: 350+ line system prompt that adjusts conversation complexity
- **Streaming Interface**: Real-time AI responses with loading states
- **File Processing**: Client-side file conversion (images, videos, audio, PDFs)
- **Command System**: Special commands (`/clarity`, `/research`, `/review`, `/export`)

### File Structure
```
src/
├── components/           # React components
│   ├── ChatHistory.tsx  # Message display
│   ├── ChatInput.tsx    # Input with file uploads
│   ├── ChatMessage.tsx  # Individual messages
│   ├── Header.tsx       # TTS controls
│   └── icons/           # UI icons
├── services/
│   └── geminiService.ts # AI integration
├── hooks/
│   └── useTextToSpeech.ts # TTS functionality
├── constants.ts         # AI system prompt
└── types.ts            # TypeScript definitions
```

## 🎨 Key Features

### Adaptive Discovery Engine
The AI system rates user clarity (1-10) and adjusts its guidance:
- **Low Clarity (1-3)**: Provides scaffolding, examples, multiple-choice options
- **Medium Clarity (4-7)**: Balanced guidance with validation
- **High Clarity (8-10)**: Direct, technical questions with minimal hand-holding

### Multimodal Capabilities
- **File Support**: Images, videos, audio, PDFs, documents (max 5 files, 20MB each)
- **YouTube Analysis**: Automatic video content analysis from URLs
- **Real-time Processing**: Client-side file conversion for privacy

### Command System
Special commands trigger specific behaviors:
- `/clarity [1-10]` - Adjust guidance level
- `/research [topic]` - Research mode
- `/review` - Show current VRD draft  
- `/export` - Generate final VRD document

## 🖥️ Desktop Integration

### Process Management
- **PID Tracking**: App process saved to `/tmp/kijko-app.pid`
- **Port Management**: Automatically handles ports 5173, 3000, 4173, 8080
- **Browser Automation**: Opens in default browser automatically
- **Graceful Shutdown**: Signal-based communication for clean termination

### Desktop Shortcut
The launcher creates a desktop shortcut at `/home/david/Desktop/Kijko.desktop` with:
- Categories: Development, AudioVideo, Graphics
- Automatic browser launching
- Process monitoring

## 🚀 Deployment

### Vercel Deployment
The project is configured for Vercel deployment:

1. **Connect Repository** to Vercel
2. **Add Environment Variables** in Vercel dashboard:
   - `GEMINI_API_KEY` (mark as sensitive)
3. **Deploy** - Vercel auto-detects Vite configuration

Build settings:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite

## 🔧 Development

### File Processing
- Files converted to base64 client-side
- Size limits: 20MB per file, max 5 files
- Supported formats: Images, videos, audio, PDFs, documents

### State Management
- React hooks for state management
- Streaming updates for real-time AI responses
- Message history with auto-scroll

### Error Handling
- Graceful fallbacks for TTS and file upload failures
- User-friendly error messages
- Comprehensive try-catch around AI service calls

## 🎤 Text-to-Speech

The app includes built-in TTS functionality:
- **Web Speech API** integration
- **Toggle Control** in header
- **Auto-narration** of AI responses (when enabled)
- **Stop/Start Controls** for user control

## 📝 License

This project is part of the Kijko Video Brief Assistant system.

## 🔗 Related

This is the frontend component of a larger video production workflow system. For other components or enterprise features, please contact the development team.