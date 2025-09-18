# WARP.md

This file provides guidance to WARP (warp.dev) when working with the Chat VRD project.

## Project Overview

Chat VRD is a multimodal, speech-enabled Video Brief Assistant built with React 19, TypeScript, and Vite. It helps users create comprehensive Video Requirements Documents (VRDs) by guiding them through an adaptive discovery process using Google's Gemini AI.

### Key Features
- **Multimodal Chat Interface**: Text input with file attachments (images, videos, audio, documents)
- **Text-to-Speech**: Built-in speech synthesis for AI responses
- **Adaptive Discovery**: Adjusts guidance level based on user expertise (1-10 clarity scale)
- **YouTube Integration**: Automatic video URL detection and content analysis
- **Desktop Integration**: Native desktop launcher with process management

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (default port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Desktop Integration Commands
```bash
# Launch app with desktop integration
./launch-kijko.sh

# Stop all app processes and free ports
./kill-kijko.sh

# Check port usage
lsof -i :5173
```

### Environment Setup
1. Create `.env.local` file in project root
2. Add your Gemini API key: `GEMINI_API_KEY=your_api_key_here`
3. The Vite config automatically exposes this as `process.env.API_KEY` in the app

## Architecture

### Core Architecture Pattern
- **React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **Component-based architecture** with clear separation of concerns
- **Service layer** for AI integration (Gemini API)
- **Custom hooks** for reusable functionality (Text-to-Speech)

### Key Architectural Concepts

#### 1. Adaptive AI System
The core innovation is the **Adaptive Discovery Engine** in `constants.ts` (KIJKO_SYSTEM_PROMPT):
- **Vision Clarity Assessment**: Rates user clarity 1-10 to adjust guidance level
- **Phase-based Conversation**: Initial Assessment → Adaptive Discovery → Information Gathering → Intelligent Assistance
- **Command System**: Special commands like `/clarity`, `/research`, `/review`, `/export` for advanced interactions

#### 2. Message Flow Architecture
```
User Input → ChatInput → App (state management) → GeminiService → Streaming Response → ChatHistory
```
- **Streaming responses** for real-time AI feedback
- **Attachment processing** converts files to base64 for AI analysis
- **YouTube URL detection** automatically analyzes video content

#### 3. Desktop Integration System
- **Process management** via shell scripts with PID tracking
- **Port management** automatically handles 5173, 3000, 4173, 8080
- **Signal-based shutdown** using file-based communication
- **Browser automation** with `xdg-open` integration

### File Structure Significance

#### Component Architecture
- `components/`: Modular React components with single responsibilities
  - `ChatHistory.tsx`: Auto-scrolling message display
  - `ChatInput.tsx`: File upload + text input with validation
  - `ChatMessage.tsx`: Individual message rendering
  - `Header.tsx`: TTS controls and branding
  - `icons/`: UI icon components (SpeakerIcons, AttachmentIcon, SendIcon, FileIcons)

#### Core Services
- `services/geminiService.ts`: AI integration layer
  - Chat initialization with system prompts
  - Streaming message handling
  - File attachment processing
  - YouTube URL detection and context addition

#### Types & Configuration
- `types.ts`: TypeScript definitions for messages and attachments
- `constants.ts`: Contains the sophisticated AI system prompt (350+ lines)
- `hooks/useTextToSpeech.ts`: Web Speech API integration

### AI Integration Details

#### System Prompt Architecture
The system prompt in `constants.ts` implements:
- **Multi-phase conversation management**
- **Adaptive questioning based on user expertise**
- **Command recognition system**
- **VRD generation pipeline**
- **Tone adaptation for different user types**

#### Gemini Configuration
- Uses `gemini-2.5-flash` model
- Streaming responses for real-time feedback
- Multimodal support (text, images, video, audio)
- YouTube URL content analysis integration

## Development Patterns

### State Management
- React state with hooks (no external state management)
- Message state managed in main `App.tsx`
- Streaming state updates for real-time AI responses

### Error Handling
- Try-catch blocks around AI service calls
- User-friendly error messages
- Graceful fallbacks for TTS and file upload failures

### File Processing
- Client-side file conversion to base64
- File size limits (20MB) and count limits (5 files)
- Support for images, videos, audio, PDFs, and documents

## Desktop Integration Specifics

### Process Management
- PID tracking in `/tmp/kijko-app.pid`
- Signal file communication via `/home/david/Downloads/kijko-shutdown-signal.txt`
- Comprehensive port cleanup across common dev ports

### Desktop Shortcut
- Located at `/home/david/Desktop/Kijko.desktop`
- Categories: Development, AudioVideo, Graphics
- Automatic browser launching on startup

## Deployment Configuration

### Vercel Deployment
- Framework auto-detection for React/Vite
- Environment variables via Vercel dashboard
- Build command: `npm run build`
- Output directory: `dist/` (Vite default)

### Environment Variables Required
- `GEMINI_API_KEY`: Google Gemini API key (mark as sensitive in Vercel)

## Troubleshooting

### Common Issues
1. **Port conflicts**: Run `./kill-kijko.sh` to free all ports
2. **API key errors**: Ensure `.env.local` contains valid `GEMINI_API_KEY`
3. **Desktop launcher issues**: Check script permissions with `chmod +x launch-kijko.sh`
4. **Node/npm not found**: Scripts load nvm environment automatically

### Debugging Commands
```bash
# Check running processes
ps aux | grep kijko

# Monitor port usage
lsof -i :5173

# Test build locally
npm run build

# Verify environment
node --version && npm --version
```

## AI Interaction Guidelines

When working with this codebase, understand that:
- The AI system is designed for **video production consultation**
- User interactions follow a **structured conversation flow**
- The system adapts its **complexity based on user expertise**
- **Special commands** (`/clarity`, `/research`, `/export`) trigger specific behaviors
- **File attachments** are automatically analyzed as visual or document references
- **YouTube URLs** are detected and used for content analysis

## Development Notes

- Use **React 19** patterns and features
- Maintain **TypeScript strict mode** compliance
- Follow the existing **component composition** patterns
- **Streaming responses** require careful state management
- **File processing** happens client-side for privacy
- **Desktop integration** requires shell script testing on Linux

## Project Structure Consolidation

### Duplicate Files Resolution
This project has both root-level and `src/` directory structures:
- Root level: `App.tsx`, `constants.ts`, `types.ts`, `index.tsx`
- `src/` directory: Contains duplicates/alternatives

**Recommendation**: Consolidate to either root-level OR src/ structure for consistency.

### Component Organization
- Main components in `components/` directory
- Icon components in `components/icons/` subdirectory
- Custom hooks in `hooks/` directory
- Services and utilities in `services/` directory