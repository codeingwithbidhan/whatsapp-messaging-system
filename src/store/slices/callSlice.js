import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for call operations
export const initiateCall = createAsyncThunk(
    'call/initiate',
    async ({ participantId, callType }, { rejectWithValue, getState }) => {
        try {
            const { auth } = getState();
            const callData = {
                id: `call_${Date.now()}`,
                callerId: auth.user.id,
                participantId,
                callType, // 'voice' or 'video'
                status: 'calling',
                createdAt: new Date().toISOString(),
            };

            // In a real app, this would make an API call
            // await callAPI.initiateCall(callData);
            return callData;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to initiate call');
        }
    }
);

export const acceptCall = createAsyncThunk (
    'call/accept',
    async (callId, { rejectWithValue }) => {
        try {
            // In a real app, this would make an API call
            // await callAPI.acceptCall(callId);

            return { callId, acceptedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to accept call');
        }
    }
);

export const declineCall = createAsyncThunk(
    'call/decline',
    async (callId, { rejectWithValue }) => {
        try {
            // In a real app, this would make an API call
            // await callAPI.declineCall(callId);

            return { callId, declinedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to decline call');
        }
    }
);

export const endCall = createAsyncThunk(
    'call/end',
    async (callId, { rejectWithValue }) => {
        try {
            // In a real app, this would make an API call
            // await callAPI.endCall(callId);

            return { callId, endedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to end call');
        }
    }
);

const callSlice = createSlice({
    name: 'call',
    initialState: {
        // Current active call
        activeCall: null,

        // Call history
        callHistory: [],

        // Call states
        isCallModalOpen: false,
        callStatus: 'idle', // idle, calling, ringing, connecting, connected, ended, failed
        callType: null, // voice, video
        callDuration: 0,

        // Call participants
        caller: null,
        participant: null,

        // Media states
        isMuted: false,
        isVideoEnabled: true,
        isSpeakerOn: false,
        isCameraLoading: false,
        cameraError: null,

        // UI states
        isMinimized: false,
        showControls: true,

        // WebRTC states
        localStream: null,
        remoteStream: null,
        remoteStreamReady: false,
        peerConnection: null,

        // Socket states
        isConnected: false,

        // Loading and error states
        loading: false,
        error: null,
    },
    reducers: {
        // Call modal management
        openCallModal: (state, action) => {
            state.isCallModalOpen = true;
            state.callType = action.payload.callType;
            state.participant = action.payload.participant;
            state.callStatus = 'calling';
            state.isMinimized = false;
        },

        closeCallModal: (state) => {
            state.isCallModalOpen = false;
            state.callStatus = 'idle';
            state.activeCall = null;
            state.callDuration = 0;
            state.isMinimized = false;
            state.showControls = true;
            // Reset media states
            state.isMuted = false;
            state.isVideoEnabled = true;
            state.isSpeakerOn = false;
            state.cameraError = null;
        },

        // Call status management
        setCallStatus: (state, action) => {
            console.log('action.payload', action.payload)
            state.callStatus = action.payload;
            if (action.payload === 'connected') {
                state.callDuration = 0;
            }
        },

        // Call duration
        incrementCallDuration: (state) => {
            if (state.callStatus === 'connected') {
                state.callDuration += 1;
            }
        },

        // Media controls
        toggleMute: (state) => {
            state.isMuted = !state.isMuted;
        },

        toggleVideo: (state) => {
            state.isVideoEnabled = !state.isVideoEnabled;
        },

        toggleSpeaker: (state) => {
            state.isSpeakerOn = !state.isSpeakerOn;
        },

        // Camera states
        setCameraLoading: (state, action) => {
            state.isCameraLoading = action.payload;
        },

        setCameraError: (state, action) => {
            state.cameraError = action.payload;
            state.isCameraLoading = false;
        },

        // UI controls
        toggleMinimize: (state) => {
            state.isMinimized = !state.isMinimized;
        },

        setShowControls: (state, action) => {
            state.showControls = action.payload;
        },

        // WebRTC stream management
        setLocalStream: (state, action) => {
            console.log('local stream test form redux => ', action.payload)
            state.localStream = action.payload;
        },

        setRemoteStream: (state, action) => {
            state.remoteStream = action.payload;
        },

        setRemoteStreamReady: (state, action) => {
            state.remoteStreamReady = action.payload;
        },

        setPeerConnection: (state, action) => {
            state.peerConnection = action.payload;
        },

        // Socket connection
        setSocketConnected: (state, action) => {
            state.isConnected = action.payload;
        },

        // Incoming call handling
        receiveIncomingCall: (state, action) => {
            // callType:"voice"
            // callerId:1
            // offer:sdp:"v=0\r\no=- 5936259864152891569 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS 114c22e5-e880-4a28-bedc-1562ffeab868\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:58Ep\r\na=ice-pwd:ulYY/oIHMxKuTXi3I38MBRGw\r\na=ice-options:trickle\r\na=fingerprint:sha-256 65:80:92:7D:C8:44:55:36:C2:EF:AB:A5:23:3E:A2:0D:D2:76:22:39:8A:7C:66:B6:E9:9A:49:00:F5:BD:E1:7D\r\na=setup:actpass\r\na=mid:0\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=sendrecv\r\na=msid:114c22e5-e880-4a28-bedc-1562ffeab868 29a39afa-c8ab-4ded-ab6f-093447f2962f\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:63 red/48000/2\r\na=fmtp:63 111/111\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:4215845984 cname:e+dhG4gLoA+dQg0P\r\na=ssrc:4215845984 msid:114c22e5-e880-4a28-bedc-1562ffeab868 29a39afa-c8ab-4ded-ab6f-093447f2962f\r\n"
            // type : "offer"
            const callData = action.payload;
            state.activeCall = callData;
            state.isCallModalOpen = true;
            state.callStatus = 'ringing';
            state.callType = callData.callType;
            state.caller = callData.caller ?? 'Dai Nai';
            state.isMinimized = false;
        },

        // Call history
        addToCallHistory: (state, action) => {
            state.callHistory.unshift(action.payload);
            // Keep only last 50 calls
            if (state.callHistory.length > 50) {
                state.callHistory = state.callHistory.slice(0, 50);
            }
        },

        // WebRTC signaling
        handleWebRTCOffer: (state, action) => {
            // Handle incoming WebRTC offer
            state.callStatus = 'connecting';
        },

        handleWebRTCAnswer: (state, action) => {
            // Handle WebRTC answer
            state.callStatus = 'connected';
        },

        handleICECandidate: (state, action) => {
            // Handle ICE candidate
        },

        // Error handling
        clearError: (state) => {
            state.error = null;
        },

        // Reset call state
        resetCallState: (state) => {
            state.isCallModalOpen = false;
            state.activeCall = null;
            state.callStatus = 'idle';
            state.callDuration = 0;
            state.caller = null;
            state.participant = null;
            state.isMuted = false;
            state.isVideoEnabled = true;
            state.isSpeakerOn = false;
            state.cameraError = null;
            state.isCameraLoading = false;
            state.isMinimized = false;
            state.showControls = true;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Initiate Call
            .addCase(initiateCall.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(initiateCall.fulfilled, (state, action) => {
                state.loading = false;
                state.activeCall = action.payload;
                state.callStatus = 'calling';
                state.isCallModalOpen = true;
                state.callType = action.payload.callType;
            })
            .addCase(initiateCall.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.callStatus = 'failed';
            })

            // Accept Call
            .addCase(acceptCall.pending, (state) => {
                state.loading = true;
                state.callStatus = 'connecting';
            })
            .addCase(acceptCall.fulfilled, (state, action) => {
                state.loading = false;
                state.callStatus = 'connected';
                state.callDuration = 0;
            })
            .addCase(acceptCall.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.callStatus = 'failed';
            })

            // Decline Call
            .addCase(declineCall.fulfilled, (state, action) => {
                state.callStatus = 'ended';
                state.isCallModalOpen = false;
                state.activeCall = null;

                // Add to call history
                // if (state.activeCall) {
                //     state.callHistory.unshift({
                //         ...state.activeCall,
                //         status: 'declined',
                //         endedAt: action.payload.declinedAt,
                //     });
                // }
            })

            // End Call
            .addCase(endCall.fulfilled, (state, action) => {
                // Add to call history
                // if (state.activeCall) {
                //     state.callHistory.unshift({
                //         ...state.activeCall,
                //         status: 'ended',
                //         duration: state.callDuration,
                //         endedAt: action.payload.endedAt,
                //     });
                // }

                // Reset call state
                state.activeCall = null;
                state.callStatus = 'ended';
                state.isCallModalOpen = false;
                state.callDuration = 0;
                state.isMinimized = false;
                state.showControls = true;
                state.isMuted = false;
                state.isVideoEnabled = true;
                state.isSpeakerOn = false;
                state.cameraError = null;
                state.isCameraLoading = false;
            });
    },
});

export const {
    openCallModal,
    closeCallModal,
    setCallStatus,
    incrementCallDuration,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    setCameraLoading,
    setCameraError,
    toggleMinimize,
    setShowControls,
    setLocalStream,
    setRemoteStream,
    setRemoteStreamReady,
    setPeerConnection,
    setSocketConnected,
    receiveIncomingCall,
    addToCallHistory,
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleICECandidate,
    clearError,
    resetCallState,
} = callSlice.actions;

export default callSlice.reducer;