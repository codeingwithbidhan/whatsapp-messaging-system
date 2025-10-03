import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setCameraLoading, setCameraError, setShowControls } from '../../store/slices/callSlice';
import {Phone,PhoneOff,Video,VideoOff,Mic,MicOff,Volume2,VolumeX,Minimize2,Maximize2,Settings,Users,MessageCircle
} from 'lucide-react';
import store from "../../store/store.js";
import { socketService } from '../../socket/socket.js';

const CallModal = ({
                       isOpen,
                       activeCall,
                       callType = 'voice', // 'voice' or 'video'
                       participant,
                       callStatus = 'calling', // 'calling', 'connecting', 'connected', 'ended'
                       duration = 0,
                       onAccept,
                       onDecline,
                       onClose,
                       onToggleMute,
                       onToggleVideo,
                       onToggleSpeaker,
                       onToggleMinimize,
                       isMuted = false,
                       isVideoEnabled = true,
                       isSpeakerOn = false,
                       isMinimized = false,
                       cameraError,
                       isCameraLoading:cameraLoading,
                       isRemoteStreamReady = false,
                       localStream
                   }) => {
    const dispatch = useDispatch();
    const [showControlsLocal, setShowControlsLocal] = useState(true);
    const [controlsTimeout, setControlsTimeout] = useState(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);

    // --- Media Stream Attachment Logic ---
    // 1. Local Stream অ্যাটাচমেন্টের জন্য লজিক || এখন শুধুমাত্র localStream আপডেট হলে এই কোডটি রান করবে।
    // CallModal.js - useEffect #1 (সংশোধিত)
    useEffect(() => {

        if (!isOpen || !localStream) {
            if (!localStream && localVideoRef.current) {
                localVideoRef.current.srcObject = null; // Cleanup
            }
            return;
        }

        if (localVideoRef.current && localStream) {
            if (localVideoRef.current.srcObject === localStream) {
                return;
            }

            console.log("Attaching Local Stream to video element. (FINAL SUCCESS)");

            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => {
                console.error("Local video play failed:", e);
            });

        } else if (!localStream) {
            console.log('!localStream else if block', localStream)
            // Cleanup
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
        }
        return () => {
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
        };
        // Cleanup এর জন্য return ফাংশন আগের মতো রাখুন।
    }, [isOpen, localStream]); // 💡 ডিপেন্ডেন্সিতে শুধু localStream রাখুন


    // 2. Local Track Enable/Disable লজিক (ভিডিও অন/অফ হ্যান্ডলিং)
    useEffect(() => {
        if (localStream) {
            console.log('localStream localStream =>', localStream)
            // ভিডিও টগল করার সময় শুধুমাত্র এই হুকটি চলবে
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoEnabled;
            });
        }
        // এই হুকটি শুধুমাত্র isVideoEnabled বা localStream টগল হলে চলবে
    }, [isOpen, localStream, isVideoEnabled]);


    // NEW: Attach remote stream from socketService
    useEffect(() => {
        if (!isOpen || callType !== 'video' || !isRemoteStreamReady ) return;

        // Assumes socketService provides a getter or property for the remote stream
        const remoteStreamFromService = socketService.remoteStream;

        if (remoteVideoRef.current && remoteStreamFromService) {
            console.log('Attaching Remote Stream and attempting play...');
            remoteVideoRef.current.srcObject = remoteStreamFromService;
            remoteVideoRef.current.play().catch(e => {
                // AbortError বা অন্যান্য Play Error এখানে ধরা পড়বে
                console.error("Remote video play failed:", e);
            });
        }

        return () => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        };
    }, [isOpen, callType, isRemoteStreamReady ]);

    // NEW: Attach remote stream for VOICE CALL
    useEffect(() => {
        if (!isOpen || callType !== 'voice' || !isRemoteStreamReady ) return;

        // socketService-এর remoteStream ব্যবহার করা হচ্ছে
        const remoteStreamFromService = socketService.remoteStream;

        if (remoteAudioRef.current && remoteStreamFromService) {
            console.log('Attaching Remote Audio Stream and attempting play...');
            remoteAudioRef.current.srcObject = remoteStreamFromService;
            remoteAudioRef.current.play().catch(e => {
                console.error("Remote audio play failed:", e);
            });
        }

        return () => {
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = null;
            }
        };
    }, [isOpen, callType, isRemoteStreamReady ]);

    // Format call duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Auto-hide controls for video calls
    useEffect(() => {
        if (callType === 'video' && callStatus === 'connected' && showControlsLocal) {
            const timeout = setTimeout(() => {
                setShowControlsLocal(false);
                dispatch(setShowControls(false)); // Redux state update
            }, 3000);
            setControlsTimeout(timeout);

            return () => clearTimeout(timeout);
        }
        // Cleanup timeout when call ends/status changes
        if (callStatus !== 'connected' && controlsTimeout) {
            clearTimeout(controlsTimeout);
            setControlsTimeout(null);
            setShowControlsLocal(true); // Reset control visibility
        }
    }, [callType, callStatus, showControlsLocal, dispatch]);

    // Show controls on mouse move (Re-trigger the auto-hide logic)
    const handleMouseMove = () => {
        if (callType === 'video' && callStatus === 'connected') {
            setShowControlsLocal(true);
            dispatch(setShowControls(true)); // Redux state update
            // Reset the auto-hide timer
            if (controlsTimeout) {
                clearTimeout(controlsTimeout);
                setControlsTimeout(null);
            }
        }
    };

    if (!isOpen) return null;

    // Minimized view
    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-3 flex items-center space-x-3 min-w-[200px]">
                    <div className="flex items-center space-x-2 flex-1">
                        <div className="relative">
                            <img
                                src={participant?.avatar || `https://ui-avatars.com/api/?name=${participant?.name}&background=6366f1&color=fff`}
                                alt={participant?.name}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            {callStatus === 'connected' && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{participant?.name}</p>
                            <p className="text-xs text-gray-300">
                                {callStatus === 'connected' ? formatDuration(duration) : callStatus }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={onToggleMinimize}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                            title="Expand"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 bg-red-500 hover:bg-red-600 rounded transition-colors"
                            title="End call"
                        >
                            <PhoneOff className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center" onMouseMove={handleMouseMove} >
            <div className="relative w-full h-full max-w-6xl mx-auto">
                {callType === 'video' ? (
                    // Video Call Layout
                    <div className="relative w-full h-full bg-gray-900">
                        {/* Remote Video */}
                        <div className="absolute inset-0">
                            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                                <video
                                    ref={remoteVideoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    muted
                                    playsInline
                                />
                            </div>
                            {/* Placeholder for demo */}
                            {(callStatus !== 'connected' || !isRemoteStreamReady) && (
                                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                    <div className="text-center text-white">
                                        <img
                                            src={participant?.avatar || `https://ui-avatars.com/api/?name=${participant?.name}&background=6366f1&color=fff`}
                                            alt={participant?.name}
                                            className="w-40 h-40 rounded-full mx-auto mb-6 border-4 border-white shadow-lg"
                                        />
                                        <h2 className="text-2xl font-semibold mb-2">{participant?.name}</h2>
                                        <p className="text-lg text-gray-300 capitalize">{callStatus}...</p>
                                        {callStatus === 'calling' && (
                                            <div className="flex justify-center mt-6">
                                                <div className="animate-pulse flex space-x-2">
                                                    <div className="w-3 h-3 bg-white rounded-full"></div>
                                                    <div className="w-3 h-3 bg-white rounded-full animation-delay-200"></div>
                                                    <div className="w-3 h-3 bg-white rounded-full animation-delay-400"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Local Video (Picture-in-Picture) */}
                        {isVideoEnabled && (
                            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                                {cameraLoading ? (
                                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                        <div className="text-white text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                            <p className="text-xs">Starting camera...</p>
                                        </div>
                                    </div>
                                ) : cameraError ? (
                                    <div className="absolute inset-0 bg-red-900 flex items-center justify-center">
                                        <div className="text-white text-center p-2">
                                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <Video className="w-4 h-4" />
                                            </div>
                                            <p className="text-xs">Camera unavailable</p>
                                        </div>
                                    </div>
                                ) : localStream ? (
                                    <video
                                        ref={localVideoRef}
                                        className="w-full h-full object-cover transform scale-x-[-1]"
                                        autoPlay
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                                        <div className="text-white text-center">
                                            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <Video className="w-8 h-8" />
                                            </div>
                                            <p className="text-xs">You</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Call Info Overlay */}
                        {(callStatus !== 'connected') && (
                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black via-black/50 to-transparent p-6">
                                <div className="flex items-center justify-between text-white">
                                    <div className="flex items-center space-x-3">
                                        <img
                                            src={participant?.avatar || `https://ui-avatars.com/api/?name=${participant?.name}&background=6366f1&color=fff`}
                                            alt={participant?.name}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-white"
                                        />
                                        <div>
                                            <h3 className="text-lg font-semibold">{participant?.name}</h3>
                                            <p className="text-sm text-gray-300">
                                                {callStatus === 'connected' ? formatDuration(duration) : `${callStatus}...`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={onToggleMinimize}
                                            className="p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-colors"
                                            title="Minimize"
                                        >
                                            <Minimize2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // Voice Call Layout
                    <div className="w-full h-full bg-gradient-to-br from-green-600 via-blue-600 to-purple-700 flex items-center justify-center">
                        <div className="text-center text-white max-w-md mx-auto px-6">
                            {/* Avatar with pulse animation */}
                            <div className="relative mb-8">
                                <div className={`absolute inset-0 rounded-full ${
                                    callStatus === 'connected' ? 'animate-ping bg-white opacity-20' : ''
                                }`}></div>
                                <img
                                    src={participant?.avatar || `https://ui-avatars.com/api/?name=${participant?.name}&background=6366f1&color=fff`}
                                    alt={participant?.name}
                                    className="relative w-48 h-48 rounded-full mx-auto border-8 border-white shadow-2xl"
                                />
                                {callStatus === 'connected' && (
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
                                        <Phone className="w-6 h-6 text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Call Info */}
                            <h2 className="text-3xl font-bold mb-2">{participant?.name}</h2>
                            <p className="text-xl text-white/80 mb-2">
                                {callStatus === 'connected' ? formatDuration(duration) : `${callStatus}...`}
                            </p>

                            {/* Call quality indicator */}
                            {callStatus === 'connected' && (
                                <div className="flex items-center justify-center space-x-2 mb-8">
                                    <div className="flex space-x-1">
                                        <div className="w-1 h-4 bg-white rounded-full"></div>
                                        <div className="w-1 h-6 bg-white rounded-full"></div>
                                        <div className="w-1 h-5 bg-white rounded-full"></div>
                                        <div className="w-1 h-7 bg-white rounded-full"></div>
                                    </div>
                                    <span className="text-sm text-white/70">HD Audio</span>
                                </div>
                            )}

                            {/* Calling animation */}
                            {callStatus === 'calling' && (
                                <div className="flex justify-center mb-8">
                                    <div className="animate-pulse flex space-x-3">
                                        <div className="w-4 h-4 bg-white rounded-full"></div>
                                        <div className="w-4 h-4 bg-white rounded-full animation-delay-200"></div>
                                        <div className="w-4 h-4 bg-white rounded-full animation-delay-400"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Minimize button */}
                        <button
                            onClick={onToggleMinimize}
                            className="absolute top-6 right-6 p-3 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full transition-colors"
                            title="Minimize"
                        >
                            <Minimize2 className="w-6 h-6" />
                        </button>
                        {callType === 'voice' && callStatus === 'connected' && isRemoteStreamReady && (
                            <audio
                                ref={remoteAudioRef}
                                autoPlay
                                playsInline
                                className="hidden"
                            />
                        )}
                    </div>
                )}

                {/* Call Controls */}
                <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                    callType === 'video' && callStatus === 'connected' && !showControlsLocal
                        ? 'opacity-0 translate-y-full pointer-events-none'
                        : 'opacity-100 translate-y-0'
                }`}>
                    <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-8">
                        <div className="flex items-center justify-center space-x-6">
                            { activeCall?.callerId !== store.getState().auth.user?.id && callStatus === 'ringing' ? (
                                // Incoming call controls
                                <>
                                    <button
                                        onClick={onDecline}
                                        className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
                                        title="Decline"
                                    >
                                        <PhoneOff className="w-8 h-8" />
                                    </button>

                                    <button
                                        onClick={onAccept}
                                        className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg animate-pulse"
                                        title="Accept"
                                    >
                                        <Phone className="w-8 h-8" />
                                    </button>
                                </>
                            ) : (
                                // Active call controls
                                <>
                                    {/* Mute */}
                                    <button
                                        onClick={onToggleMute}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
                                            isMuted
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                                        }`}
                                        title={isMuted ? 'Unmute' : 'Mute'}
                                    >
                                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                    </button>

                                    {/* Video toggle (only for video calls) */}
                                    {callType === 'video' && (
                                        <button
                                            onClick={onToggleVideo}
                                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
                                                !isVideoEnabled
                                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                                            }`}
                                            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                                            disabled={cameraLoading}
                                        >
                                            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                                        </button>
                                    )}

                                    {/* Speaker toggle (only for voice calls) */}
                                    {callType === 'voice' && (
                                        <button
                                            onClick={onToggleSpeaker}
                                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
                                                isSpeakerOn
                                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                                            }`}
                                            title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
                                        >
                                            {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                                        </button>
                                    )}

                                    {/* Additional controls */}
                                    <button
                                        className="w-14 h-14 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
                                        title="Add participant"
                                    >
                                        <Users className="w-6 h-6" />
                                    </button>

                                    <button
                                        className="w-14 h-14 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
                                        title="Send message"
                                    >
                                        <MessageCircle className="w-6 h-6" />
                                    </button>

                                    {/* End call */}
                                    <button
                                        onClick={onClose}
                                        className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
                                        title="End call"
                                    >
                                        <PhoneOff className="w-8 h-8" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Call status text */}
                        <div className="text-center mt-4">
                            <p className="text-white text-sm opacity-75">
                                {activeCall?.callerId !== store.getState().auth.user?.id && callStatus === 'ringing' && 'Incoming call'}
                                {callStatus === 'calling' && 'Connecting...'}
                                {callStatus === 'connected' && `${callType === 'video' ? 'Video' : 'Voice'} call active`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Keyboard shortcuts help */}
            {callStatus === 'connected' && (
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs p-3 rounded-lg">
                    <div className="space-y-1">
                        <div><kbd className="bg-gray-600 px-1 rounded">M</kbd> Mute/Unmute</div>
                        {callType === 'video' && <div><kbd className="bg-gray-600 px-1 rounded">V</kbd> Video On/Off</div>}
                        <div><kbd className="bg-gray-600 px-1 rounded">Esc</kbd> End Call</div>
                        {cameraError && (
                            <div className="mt-2 text-red-300">
                                <div className="text-xs">Camera: {cameraError}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallModal;