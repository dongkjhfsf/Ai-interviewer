import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Message, OutputMode, InterviewMode, ContextSource, ApiConfig } from '../types';

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
  apiConfig: ApiConfig,
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
  
  // Keep track of latest messages for API calls without re-binding
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const getSystemInstruction = useCallback(() => {
    let instruction = `You are an expert technical interviewer conducting a ${mode === 'tech' ? 'realistic technical interview' : 'module practice session'}. `;
    if (contextSource.type === 'url' && contextSource.value) {
      instruction += `The candidate has provided this GitHub URL as context: ${contextSource.value}. Please ask questions related to this project. `;
    } else if (contextSource.type === 'file' && contextSource.name) {
      instruction += `The candidate has provided a file named ${contextSource.name} as context. `;
    } else if (contextSource.type === 'folder' && contextSource.name) {
      instruction += `The candidate has provided a project folder (${contextSource.name}) as context. `;
    }
    instruction += "Keep your responses concise, professional, and conversational. Start by briefly introducing yourself and asking the first question.";
    return instruction;
  }, [mode, contextSource]);

  const sendMessage = useCallback(async (text: string) => {
    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    if (apiConfig.provider === 'gemini') {
      if (sessionRef.current) {
        sessionRef.current.sendRealtimeInput([{ text }]);
      }
    } else if (apiConfig.provider === 'doubao') {
      // Doubao / OpenAI Compatible Implementation
      try {
        const instruction = getSystemInstruction();
        const history = messagesRef.current.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
        
        const response = await fetch(apiConfig.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
          },
          body: JSON.stringify({
            model: apiConfig.modelName,
            messages: [
              { role: 'system', content: instruction },
              ...history,
              { role: 'user', content: text }
            ],
            stream: true // Enable streaming for better UX
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMsgId = Date.now().toString();
        currentAiMessageIdRef.current = aiMsgId;
        
        // Initial empty AI message
        setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: '', timestamp: new Date() }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '');
              if (dataStr === '[DONE]') break;
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices[0]?.delta?.content || '';
                if (content) {
                  handleAiText(content);
                }
              } catch (e) {
                console.error("Error parsing stream:", e);
              }
            }
          }
        }
        currentAiMessageIdRef.current = null;

      } catch (err: any) {
        console.error("Doubao API Error:", err);
        setError(err.message);
      }
    }
  }, [apiConfig, handleAiText, getSystemInstruction]);

  const startInterview = useCallback(async () => {
    try {
      setError(null);
      setMessages([]);
      setConnectionState('connecting');

      if (apiConfig.provider === 'doubao') {
        // For Doubao, we just set connected state and trigger the greeting
        if (!apiConfig.apiKey || !apiConfig.modelName) {
           throw new Error("API Key and Model Name are required for Doubao API.");
        }
        setConnectionState('connected');
        setIsListening(true); // "Listening" in this context means session active
        
        // Trigger greeting
        // We simulate this by calling sendMessage with a hidden prompt or just letting the user start?
        // Better to have AI start.
        // We can't "inject" a prompt easily without it showing up as user message if we use sendMessage.
        // So we'll manually trigger a completion for the greeting.
        
        const instruction = getSystemInstruction();
        try {
            const response = await fetch(apiConfig.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
              },
              body: JSON.stringify({
                model: apiConfig.modelName,
                messages: [
                  { role: 'system', content: instruction },
                  { role: 'user', content: "Hello, I am ready for the interview. Please introduce yourself." }
                ],
                stream: true
              })
            });
            
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiMsgId = Date.now().toString();
            currentAiMessageIdRef.current = aiMsgId;
            setMessages([{ id: aiMsgId, role: 'ai', content: '', timestamp: new Date() }]);

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim() !== '');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.replace('data: ', '');
                  if (dataStr === '[DONE]') break;
                  try {
                    const data = JSON.parse(dataStr);
                    const content = data.choices[0]?.delta?.content || '';
                    if (content) handleAiText(content);
                  } catch (e) {}
                }
              }
            }
            currentAiMessageIdRef.current = null;
        } catch (e: any) {
            setError(e.message);
            setConnectionState('error');
        }
        return;
      }
      
      // GEMINI LIVE LOGIC
      
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
      const genai = new GoogleGenAI({ apiKey: apiConfig.apiKey || process.env.GEMINI_API_KEY });

      const systemInstruction = getSystemInstruction();

      // 4. Connect to Live API
      const sessionPromise = genai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          // Enable transcription for both input and output
          inputAudioTranscription: {}, 
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
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampledData = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
        const pcm16 = new Int16Array(downsampledData.length);
        for (let i = 0; i < downsampledData.length; i++) {
          let s = Math.max(-1, Math.min(1, downsampledData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const base64 = arrayBufferToBase64(pcm16.buffer);
        session.sendRealtimeInput({
          media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;

      // 6. Send Initial Greeting Trigger
      await session.sendRealtimeInput({ text: "Hello, I am ready for the interview." });

    } catch (err: any) {
      console.error("Failed to start interview:", err);
      setConnectionState('error');
      setError(err.message || "Failed to access microphone or connect to API.");
      stopInterview();
    }
  }, [apiConfig, mode, outputMode, contextSource, handleAiText, getSystemInstruction]);

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
    stopInterview,
    sendMessage // Expose this
  };
}
