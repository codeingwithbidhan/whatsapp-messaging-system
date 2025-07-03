import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share, ZoomIn, ZoomOut, RotateCw, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

const MediaViewer = ({ isOpen, onClose, files, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState(null);

  const currentFile = files[currentIndex];
  const isImage = currentFile?.type?.startsWith('image/');
  const isVideo = currentFile?.type?.startsWith('video/');

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    // Reset zoom and rotation when switching files
    setZoom(1);
    setRotation(0);
    setIsPlaying(false);
    setShowControls(true);
    clearTimeout(controlsTimeout);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          if (isVideo) {
            e.preventDefault();
            togglePlayPause();
          }
          break;
        case 'f':
        case 'F':
          if (isVideo) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'm':
        case 'M':
          if (isVideo) {
            e.preventDefault();
            toggleMute();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, isVideo, isPlaying, isFullscreen]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls for videos
  useEffect(() => {
    if (isVideo && showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
      
      return () => clearTimeout(timeout);
    }
  }, [isVideo, showControls, isPlaying]);

  if (!isOpen || !files || files.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const togglePlayPause = () => {
    const video = document.getElementById('media-video');
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const video = document.getElementById('media-video');
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        const element = document.querySelector('.media-viewer-container');
        if (element && element.requestFullscreen) {
          await element.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
    }
  };

  const handleVideoTimeUpdate = (e) => {
    setVideoCurrentTime(e.target.currentTime);
  };

  const handleVideoLoadedMetadata = (e) => {
    setVideoDuration(e.target.duration);
  };

  const handleVideoSeek = (e) => {
    const video = document.getElementById('media-video');
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * videoDuration;
    
    if (video) {
      video.currentTime = newTime;
      setVideoCurrentTime(newTime);
    }
  };

  const handleMouseMove = () => {
    if (isVideo) {
      setShowControls(true);
      clearTimeout(controlsTimeout);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = currentFile.url;
    link.download = currentFile.name;
    link.click();
  };

  return (
    <div 
      className={`media-viewer-container fixed inset-0 bg-black z-50 flex items-center justify-center ${
        isFullscreen ? 'bg-opacity-100' : 'bg-opacity-95'
      }`}
      onMouseMove={handleMouseMove}
    >
      {/* Header - Hide in fullscreen when controls are hidden */}
      {(!isFullscreen || showControls) && (
        <div className={`absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 z-10 transition-opacity duration-300 ${
          isVideo && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium truncate max-w-md">
                {currentFile.name}
              </h3>
              <span className="text-sm text-gray-300">
                {currentIndex + 1} of {files.length}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {isImage && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                    title="Rotate"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </>
              )}
              
              {isVideo && (
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (F)"}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              )}
              
              <button
                onClick={downloadFile}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <button
                onClick={isFullscreen ? exitFullscreen : onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Arrows - Hide in fullscreen when controls are hidden */}
      {files.length > 1 && (!isFullscreen || showControls) && (
        <>
          <button
            onClick={goToPrevious}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all z-10 ${
              isVideo && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            title="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={goToNext}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all z-10 ${
              isVideo && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            title="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Media Content */}
      <div className="flex items-center justify-center w-full h-full p-4">
        {isImage && (
          <img
            src={currentFile.url}
            alt={currentFile.name}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        )}
        
        {isVideo && (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              id="media-video"
              src={currentFile.url}
              className="max-w-full max-h-full object-contain"
              controls={false}
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlayPause}
            />
            
            {/* Video Controls - Always at bottom */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-all duration-300 ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
            }`}>
              <div className="p-4 space-y-3">
                {/* Progress Bar */}
                <div className="w-full">
                  <div 
                    className="bg-white bg-opacity-30 rounded-full h-2 cursor-pointer hover:h-3 transition-all duration-200"
                    onClick={handleVideoSeek}
                  >
                    <div 
                      className="bg-white rounded-full h-full transition-all duration-100 relative"
                      style={{ width: `${(videoCurrentTime / videoDuration) * 100}%` }}
                    >
                      <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
                    </div>
                  </div>
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={togglePlayPause}
                      className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                      title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                      title={isMuted ? "Unmute (M)" : "Mute (M)"}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    
                    <span className="text-sm font-mono">
                      {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                      title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (F)"}
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Play Button (when paused) */}
            {!isPlaying && (
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all"
              >
                <div className="bg-white bg-opacity-90 rounded-full p-4 hover:bg-opacity-100 transition-all">
                  <Play className="w-12 h-12 text-gray-800" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation - Hide in fullscreen when controls are hidden */}
      {files.length > 1 && (!isFullscreen || showControls) && (
        <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black bg-opacity-50 rounded-lg p-2 transition-all duration-300 ${
          isVideo && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                index === currentIndex ? 'border-white' : 'border-transparent'
              }`}
            >
              {file.type?.startsWith('image/') ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : file.type?.startsWith('video/') ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center relative">
                  <video
                    src={file.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-3 h-3 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-white text-xs">FILE</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Help (only show in fullscreen) */}
      {isFullscreen && isVideo && showControls && (
        <div className="absolute top-20 right-4 bg-black bg-opacity-70 text-white text-xs p-3 rounded-lg">
          <div className="space-y-1">
            <div><kbd className="bg-gray-600 px-1 rounded">Space</kbd> Play/Pause</div>
            <div><kbd className="bg-gray-600 px-1 rounded">F</kbd> Fullscreen</div>
            <div><kbd className="bg-gray-600 px-1 rounded">M</kbd> Mute</div>
            <div><kbd className="bg-gray-600 px-1 rounded">Esc</kbd> Exit</div>
            <div><kbd className="bg-gray-600 px-1 rounded">←→</kbd> Navigate</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaViewer;