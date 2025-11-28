import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X, Play, Pause, Square } from 'lucide-react';

const VoiceRecorder = ({ isOpen, onClose, onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // useEffect(() => {
  //   if (isOpen) {
  //     startRecording();
  //   } else {
  //     cleanup();
  //   }

  //   return () => cleanup();
  // }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let timeout = setTimeout(() => startRecording(), 10);

    return () => {
      clearTimeout(timeout);
      cleanup();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const cleanup = () => {
    setAudioBlob(null);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioUrl(null);
    setIsPlaying(false);
    setPlaybackTime(0);
    setDuration(0);
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } 
      else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } 
      else {
        mimeType = "";
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.onerror = (e) => {
        console.error("Recorder error: ", e.error);
        alert("Recording failed. Please try again.");
        cleanup();
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (!blob || blob.size === 0) {
          console.warn("Empty blob, retrying...");
          alert("No audio captured. Please re-record.");
          return;
        }
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Get duration
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });

      };
      
      // Safari detection
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // start recodeing
      mediaRecorder.start(isSafari ? undefined : 100); // Collect data every 100ms

      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
      onClose();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {

    if (!chunksRef.current.length) {
      console.warn("No audio captured");
      alert("No audio recorded. Please try again.");
      cleanup();
      return;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
    setIsPaused(false);
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      audioRef.current.currentTime = newTime;
      setPlaybackTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (audioBlob && audioUrl) {
      const voiceMessage = {
        type: 'voice',
        audioBlob,
        audioUrl,
        duration: formatTime(duration),
        size: audioBlob.size
      };
      onSend(voiceMessage);
      onClose();
    }
  };

  const handleCancel = () => {
    stopRecording();
    cleanup();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-2 pl-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            {isRecording ? 'Recording Voice Message' : 'Voice Message'}
          </h3>
          {/* <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button> */}
        </div>

        {/* Recording Area */}
        <div className="p-4 space-y-4">
          {/* Waveform Visualization (Mock) */}
          <div className="flex items-center justify-center h-10 bg-gray-50 rounded-lg">
            <div className="flex items-end space-x-1 h-8">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 bg-green-500 rounded-full transition-all duration-300 ${
                    isRecording && !isPaused
                      ? 'animate-pulse'
                      : ''
                  }`}
                  style={{
                    height: `${Math.random() * 80}%`,
                    minHeight: '4px',
                    opacity: isRecording && !isPaused ? 1 : 0.3
                  }}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-800">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-gray-500 mt-0">
              {isRecording 
                ? isPaused 
                  ? 'Recording paused' 
                  : 'Recording...'
                : audioBlob 
                  ? 'Recording complete'
                  : 'Tap to start recording'
              }
            </p>
          </div>

          {/* Playback Controls (when recording is done) */}
          {audioBlob && audioUrl && (
            <div className="space-y-2">
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={handleAudioEnded}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    setDuration(audioRef.current.duration);
                  }
                }}
              />
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div 
                  className="bg-gray-200 rounded-full h-2 cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="bg-green-500 rounded-full h-2 transition-all duration-100"
                    style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatTime(playbackTime)}</span>
                  {/* <span>{formatTime(duration)}</span> */}
                </div>
              </div>

              {/* Playback Button */}
              <div className="flex justify-center">
                <button
                  onClick={isPlaying ? pauseAudio : playAudio}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
              </div>
            </div>
          )}

          {/* Recording Controls */}
          <div className="flex items-center justify-center space-x-2 m-0">
            {isRecording ? (
              <>
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-colors"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={stopRecording}
                  className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  title="Stop Recording"
                >
                  <Square className="w-6 h-6" />
                </button>
              </>
            ) : !audioBlob ? (
              <button
                onClick={startRecording}
                className="p-6 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors animate-pulse"
                title="Start Recording"
              >
                <Mic className="w-8 h-8" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Footer Actions */}
        {audioBlob && (
          <div className="flex items-center justify-between p-2 border-t bg-gray-50 rounded-b-2xl">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  cleanup();
                  startRecording();
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Re-record
              </button>
              
              <button
                onClick={handleSend}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;