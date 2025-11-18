import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const VoicePlayer = ({ audioUrl, duration, isOwnMessage, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Audio failed to load');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(error => {
        console.error('Audio play failed:', error);
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || audioDuration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={`flex items-center space-x-2 p-0 rounded-lg ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`flex-shrink-0 p-2 rounded-full transition-colors ${
          isOwnMessage
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <div className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3" />
        )}
      </button>

      {/* Waveform/Progress Bar */}
      <div className="flex-1 space-y-[8px] pt-6">
        {/* Visual Waveform (Mock) */}
        <div className="flex items-center space-x-[2px] h-0">
          {Array.from({ length: 30 }).map((_, i) => {
            const barProgress = (i / 30) * 100;
            const isActive = barProgress <= progress;
            
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isActive
                    ? isOwnMessage
                      ? 'bg-white'
                      : 'bg-green-500'
                    : isOwnMessage
                      ? 'bg-white bg-opacity-30'
                      : 'bg-gray-300'
                }`}
                style={{
                  height: `${10 + Math.random() * 10}px`,
                  minHeight: '4px'
                }}
              />
            );
          })}
        </div>

        {/* Progress Bar */}
        {/* <div 
          className="w-full bg-gray-200 bg-opacity-30 rounded-full h-1 cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className={`h-1 rounded-full transition-all duration-100 ${
              isOwnMessage ? 'bg-white' : 'bg-green-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div> */}

        {/* Time Display */}
        <div className={`flex justify-between text-xs ${
          isOwnMessage ? 'text-green-100' : 'text-gray-500'
        }`}>
          <span className='text-[10px]'>{formatTime(currentTime)}</span>
          {/* <span>{formatTime(audioDuration)}</span> */}
        </div>
      </div>

      {/* Volume Button */}
      <button
        onClick={toggleMute}
        className={`flex-shrink-0 p-1 rounded-full transition-colors ${
          isOwnMessage
            ? 'hover:bg-white hover:bg-opacity-20 text-white'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default VoicePlayer;