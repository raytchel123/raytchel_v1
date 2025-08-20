import React, { useState, useRef } from 'react';
import { Mic, Square, Loader } from 'lucide-react';

interface AudioRecorderProps {
  onAudioMessage: (audioBlob: Blob) => Promise<void>;
}

export function AudioRecorder({ onAudioMessage }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        try {
          await onAudioMessage(audioBlob);
        } finally {
          setIsProcessing(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div>
      {isProcessing ? (
        <button 
          className="p-2 text-gray-400 cursor-not-allowed"
          disabled
        >
          <Loader className="w-5 h-5 animate-spin" />
        </button>
      ) : isRecording ? (
        <button
          onClick={stopRecording}
          className="p-2 text-red-600 hover:bg-red-50 rounded-full"
        >
          <Square className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={startRecording}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}