import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Message, OutputMode, InterviewMode, ContextSource } from '../types';

// Helper for downsampling audio to 16kHz
function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
  if (outputSampleRate === inputSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useInterview(
  api: 'gemini' | 'doubao',
  mode: InterviewMode,
  outputMode: OutputMode,
  contextSource: ContextSource
) {
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextPlayTimeRef = useRef(0);
  const currentAiMessageIdRef = useRef<string | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<any>(null);

  const handleAiText = useCallback((text: string) => {
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === 'ai' && lastMsg.id === currentAiMessageIdRef.current) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMsg, content: lastMsg.content + text };
        return updated;
      } else {
        const newId = Date.now().toString();
        currentAiMessageIdRef.current = newId;
        return [...prev, { id: newId, role: 'ai', content: text, timestamp: new Date() }];
      }
    });
  }, []);

  const startInterview = useCallback(async () => {
    try {
      setError(null);
      setMessages([]);
      setConnectionState('connecting');
      
      // 1. Get User Media
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
          } 
        });
      } catch (e) {
        throw new Error("Microphone permission denied. Please allow microphone access.");
      }
      streamRef.current = stream;

      // 2. Initialize Audio Context
      const audioCtx = new AudioContext(); 
      await audioCtx.resume(); // Ensure context is running
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Volume monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      volumeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
          setVolume(avg / 255); // Normalize to 0-1
        }
      }, 50);
      
      // 3. Initialize Gemini API
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let systemInstruction = `You are an expert technical interviewer conducting a ${mode === 'tech' ? 'realistic technical interview' : 'module practice session'}. `;
      if (contextSource.type === 'url' && contextSource.value) {
        systemInstruction += `The candidate has provided this GitHub URL as context: ${contextSource.value}. Please ask questions related to this project. `;
      } else if (contextSource.type === 'file' && contextSource.name) {
        systemInstruction += `The candidate has provided a file named ${contextSource.name} as context. `;
      } else if (contextSource.type === 'folder' && contextSource.name) {
        systemInstruction += `The candidate has provided a project folder (${contextSource.name}) as context. `;
      }
      systemInstruction += "Keep your responses concise, professional, and conversational. Start by briefly introducing yourself and asking the first question.";

      // 4. Connect to Live API
      const sessionPromise = genai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          // Enable transcription for both input and output
          // Note: Do not specify model name inside these objects for the Live API
          inputAudioTranscription: {}, 
          // outputAudioTranscription: {}, // Optional: if we want AI text transcription from the server
          systemInstruction: { parts: [{ text: systemInstruction }] },
        },
        callbacks: {
          onopen: () => {
            console.log("Live API connected");
            setConnectionState('connected');
            setIsListening(true);
          },
          onmessage: (message: any) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputMode === 'voice') {
              playAudioChunk(base64Audio, audioCtx);
            }
            
            // Handle Text / Transcription (AI)
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.text) {
                  handleAiText(part.text);
                }
              }
            }

            // Handle User Transcription
            // The API returns user transcription in turnComplete or similar events
            // We'll check for it here. Note: The exact field structure depends on the API version.
            // For now, we'll check common patterns.
            const userTranscript = message.serverContent?.turnComplete?.parts?.[0]?.text;
            if (userTranscript) {
               setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userTranscript, timestamp: new Date() }]);
            }
            
            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = 0;
              currentAiMessageIdRef.current = null;
            }
          },
          onclose: () => {
            console.log("Live API closed");
            setConnectionState('disconnected');
            stopInterview();
          },
          onerror: (err: any) => {
            console.error("Live API error:", err);
            setConnectionState('error');
            setError(err.message || "Connection error occurred.");
            stopInterview();
          }
        }
      });
      
      sessionRef.current = sessionPromise;
      const session = await sessionPromise;

      // 5. Setup Audio Processing & Sending
      // Use 4096 buffer size for balance between latency and performance
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Downsample to 16kHz if necessary
        const downsampledData = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
        
        // Convert to 16-bit PCM
        const pcm16 = new Int16Array(downsampledData.length);
        for (let i = 0; i < downsampledData.length; i++) {
          let s = Math.max(-1, Math.min(1, downsampledData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Send to API
        const base64 = arrayBufferToBase64(pcm16.buffer);
        session.sendRealtimeInput({
          media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;

      // 6. Send Initial Greeting Trigger
      // This ensures the AI speaks first
      await session.sendRealtimeInput({ text: "Hello, I am ready for the interview." });

    } catch (err: any) {
      console.error("Failed to start interview:", err);
      setConnectionState('error');
      setError(err.message || "Failed to access microphone or connect to API.");
      stopInterview();
    }
  }, [api, mode, outputMode, contextSource, handleAiText]);

  const playAudioChunk = (base64: string, audioCtx: AudioContext) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }
      
      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      const currentTime = audioCtx.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime;
      }
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (e) {
      console.error("Error playing audio chunk", e);
    }
  };

  const stopInterview = useCallback(() => {
    setIsListening(false);
    // Don't reset connectionState here if it's already 'error', to keep the error visible
    setConnectionState(prev => prev === 'error' ? 'error' : 'disconnected');
    
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    setVolume(0);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    currentAiMessageIdRef.current = null;
  }, []);

  return {
    isListening,
    connectionState,
    messages,
    error,
    volume,
    startInterview,
    stopInterview
  };
}
