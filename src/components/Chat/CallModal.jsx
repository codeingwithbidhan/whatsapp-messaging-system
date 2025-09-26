import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import {useSelector} from "react-redux";

const CallModal = ({ contact, callType, onClose }) => {
    // const [isConnected, setIsConnected] = useState(false);
    const { isConnected } = useSelector((state) => state.call )
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');

    // useEffect(() => {
    //     // Simulate call connection after 3 seconds
    //     const connectTimer = setTimeout(() => {
    //         setIsConnected(true);
    //     }, 3000);
    //
    //     return () => clearTimeout(connectTimer);
    // }, []);

    useEffect(() => {
        let interval;
        if (isConnected) {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isConnected]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndCall = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-8 text-center">
                    {/* Contact Info */}
                    <div className="mb-6">
                        {contact.avatar ? (
                            <img
                                src={contact.avatar}
                                alt={contact.name}
                                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                            />
                        ) : (
                            <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-12 h-12 text-gray-600" />
                            </div>
                        )}
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">{contact.name}</h2>
                        <p className="text-gray-600">{contact.phone}</p>
                    </div>

                    {/* Call Status */}
                    <div className="mb-8">
                        {isConnected ? (
                            <div>
                                <p className="text-green-600 font-medium mb-2">Connected</p>
                                <p className="text-lg font-mono">{formatDuration(duration)}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-600 mb-2">Calling...</p>
                                <div className="flex justify-center">
                                    <div className="animate-pulse flex space-x-1">
                                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                        <div className="w-2 h-2 bg-green-600 rounded-full animation-delay-200"></div>
                                        <div className="w-2 h-2 bg-green-600 rounded-full animation-delay-400"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Call Controls */}
                    <div className="flex justify-center space-x-4">
                        {callType === 'video' && (
                            <button
                                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                                className={`p-4 rounded-full transition-colors ${
                                    isVideoEnabled
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                                title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
                            >
                                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                            </button>
                        )}

                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-4 rounded-full transition-colors ${
                                isMuted
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={handleEndCall}
                            className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            title="End call"
                        >
                            <PhoneOff className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CallModal;