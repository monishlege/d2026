# GeminiVoiceRecorder Integration Guide

## Overview

The `GeminiVoiceRecorder` component provides a complete voice recording and analysis workflow integrated with the Google Gemini AI API.

**Features:**
- ✅ Full audio recording from microphone
- ✅ Real-time recording timer (MM:SS format)
- ✅ Automatic language detection
- ✅ Text transcription
- ✅ Welfare scheme eligibility analysis
- ✅ Plain-text responses optimized for TTS
- ✅ Built-in audio playback of AI response
- ✅ Error handling and user feedback

## Components

### 1. GeminiVoiceRecorder Component

**Location:** `frontend/src/components/GeminiVoiceRecorder.tsx`

Full-featured voice recording UI with analysis display.

**Usage:**
```tsx
import GeminiVoiceRecorder from "@/components/GeminiVoiceRecorder";

export default function App() {
  const handleAnalysis = (result) => {
    console.log("Language:", result.detected_language);
    console.log("Transcript:", result.user_speech_transcript);
    console.log("Analysis:", result.scheme_analysis);
    console.log("Response:", result.spoken_response);
  };

  return (
    <GeminiVoiceRecorder 
      onAnalysisComplete={handleAnalysis}
      apiEndpoint="/api/gemini-voice-analyze"
    />
  );
}
```

**Props:**
- `onAnalysisComplete?`: Callback when analysis completes
- `apiEndpoint?`: Custom API endpoint (default: `/api/gemini-voice-analyze`)

### 2. useVoiceRecorder Hook

**Location:** `frontend/src/hooks/useVoiceRecorder.ts`

Low-level hook for custom voice recording workflows.

**Usage:**
```tsx
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

export default function CustomRecorder() {
  const {
    isRecording,
    isAnalyzing,
    elapsedSeconds,
    transcript,
    detectedLanguage,
    error,
    startRecording,
    stopRecording,
    resetRecorder,
  } = useVoiceRecorder({
    onRecordingStart: () => console.log("Recording started"),
    onRecordingStop: () => console.log("Recording stopped"),
    onAnalysisStart: () => console.log("Analyzing..."),
    onAnalysisComplete: (transcript, language) => {
      console.log(`Got transcript in ${language}: ${transcript}`);
    },
    onError: (error) => console.error(error),
  });

  return (
    <div>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
      <div>{elapsedSeconds}s</div>
      {transcript && <p>Transcript: {transcript}</p>}
    </div>
  );
}
```

**State:**
```ts
{
  isRecording: boolean;      // Currently recording audio
  isAnalyzing: boolean;      // Sending to API for analysis
  elapsedSeconds: number;    // Recording duration in seconds
  audioBlob: Blob | null;    // Recorded audio as Blob
  transcript: string;        // Extracted speech text
  detectedLanguage: string;  // Detected language (e.g., "Hindi (hi-IN)")
  error: string | null;      // Error message if any
}
```

**Methods:**
- `startRecording()`: Begin recording from microphone
- `stopRecording()`: Stop recording and auto-analyze
- `analyzeAudio(blob)`: Manually analyze an audio blob
- `resetRecorder()`: Clear state for new recording

## Integration Examples

### Example 1: Simple Home Page Integration

Add to `frontend/src/pages/Home.tsx`:

```tsx
import GeminiVoiceRecorder from "@/components/GeminiVoiceRecorder";

export default function Home() {
  return (
    <div className="container mx-auto p-6">
      <h1>JanSahayak Voice Assistant</h1>
      <GeminiVoiceRecorder 
        onAnalysisComplete={(result) => {
          if (result.status === "success") {
            // Update UI with analysis
            console.log(result);
          }
        }}
      />
    </div>
  );
}
```

### Example 2: Modal Dialog Integration

```tsx
import { useState } from "react";
import GeminiVoiceRecorder from "@/components/GeminiVoiceRecorder";

export default function VoiceModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Voice Assistant</button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-lg p-6 max-w-2xl">
            <GeminiVoiceRecorder 
              onAnalysisComplete={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
```

### Example 3: Custom Workflow with Hook

```tsx
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useState } from "react";

export default function CustomFlow() {
  const [results, setResults] = useState([]);
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder({
    onAnalysisComplete: (transcript, language) => {
      setResults(prev => [...prev, { transcript, language, timestamp: Date.now() }]);
    }
  });

  return (
    <div>
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className={isRecording ? "bg-red-500" : "bg-green-500"}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      
      <div className="results">
        {results.map((r, i) => (
          <div key={i}>
            <p><strong>{r.language}:</strong> {r.transcript}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## API Endpoint Specification

### POST /api/gemini-voice-analyze

**Request:**
```json
{
  "prompt": "Analyze this voice input for welfare scheme eligibility.",
  "audioBase64": "UklGRi4AAABXQVZFZm10IBAAAAABAAEA...",
  "userContext": "User is querying about welfare schemes."
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "detected_language": "Hindi (hi-IN)",
  "user_speech_transcript": "मुझे पीएम किसान के बारे में जानना है",
  "scheme_analysis": "User asking about PM-KISAN eligibility as farmer.",
  "spoken_response": "आप पीएम किसान के लिए पात्र हो सकते हैं। आपको छह हजार रुपये मिल सकते हैं।"
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "error_detail": "Failed to process audio"
}
```

## Supported Interactions

### Recording Control Flow
```
1. User clicks Mic → startRecording()
2. Audio stream opens, recording starts
3. Timer shows elapsed time
4. User clicks Stop → stopRecording()
5. Audio sent to Gemini API
6. Response received → onAnalysisComplete()
7. TTS plays spoken_response
```

### Supported Languages
- Hindi (hi-IN)
- Kannada (kn-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Marathi (mr-IN)
- Bengali (bn-IN)
- English (en-IN)

### Browser Support
- Chrome/Edge 49+
- Firefox 25+
- Safari 14.1+
- Mobile Chrome/Safari (iOS 14.5+)

## Styling & Customization

### TailwindCSS Styles Used
- `bg-gradient-to-b from-slate-900 to-slate-800` - Background
- `border-cyan-300/20` - Borders
- `text-cyan-300` - Primary text
- `text-red-400` - Recording state
- Wave animations for visual feedback

### Custom Styling
Override with CSS classes or edit component inline styles:
```tsx
// Edit button styles
<button className="your-custom-class">

// Edit result display styles
<div className="your-custom-class">
```

## Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| "Failed to access microphone" | No microphone permission | Grant microphone permission in browser settings |
| "No audio recorded" | Silent recording or <1s | Speak clearly and record for longer |
| "Failed to encode audio" | File system error | Check browser cache/permissions |
| "HTTP 500 - Gemini API error" | API key invalid or quota exceeded | Check GEMINI_API_KEY environment variable |
| "Invalid JSON response" | Malformed API response | Check API endpoint and system prompt |

## Performance Tips

1. **Reduce Cold-Start Time**
   - Component lazy-loads only when needed
   - Minimal dependencies for faster import

2. **Optimize Audio**
   - Uses WebM codec (compressed)
   - Echo cancellation and noise suppression enabled
   - Typical audio file: 50-200 KB

3. **Network**
   - Sends to nearest Vercel edge region
   - Typical API response: <5 seconds

4. **Memory**
   - Cleans up MediaRecorder and streams on unmount
   - Audio blob garbage collected after analysis

## Testing

### Local Testing
```bash
cd frontend
npm run dev
# Navigate to component and record your voice
```

### Test Cases
```tsx
// Test 1: Successful recording
- Click Mic, speak clearly, click Stop
- Expected: Analysis completes with transcript

// Test 2: Error handling
- Click Mic, immediately click Stop (no audio)
- Expected: "No audio recorded" error

// Test 3: Multiple languages
- Switch language, record, verify detection
- Expected: Correct language detected

// Test 4: Long recording
- Record 60+ seconds of speech
- Expected: Timer shows MM:SS correctly
```

## Troubleshooting

### Microphone not working
```
1. Check browser permissions: Settings → Privacy → Microphone
2. Verify HTTPS (required for mediaDevices.getUserMedia)
3. Check if microphone is accessible to other apps
4. Try different browser
```

### Audio not being recorded
```
1. Ensure MediaRecorder.start() was called
2. Check browser console for errors
3. Verify audio chunks are being collected
4. Test with longer recordings
```

### API returns error
```
1. Check GEMINI_API_KEY is set in environment
2. Verify API endpoint is accessible (try curl)
3. Check API quota and rate limits
4. Review error message for specific details
```

### Response not playing
```
1. Enable browser audio permissions
2. Check volume is not muted
3. Verify browser supports Web Speech API
4. Try different browser (Chrome/Edge recommended)
```

## References

- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Gemini API Documentation](https://ai.google.dev/)
