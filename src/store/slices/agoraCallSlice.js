import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// Agora এবং Socket service imports
import { agoraService } from '../agora/agoraService'; 
import { fetchAgoraToken } from '../api/callApi'; 
import { socketService } from '../services/socketService'; 

// --- Async Thunks (এগুলো সকেট সিগন্যালিং এবং টোকেন আনার কাজ করবে) ---

export const initiateCall = createAsyncThunk(
    'call/initiate',
    async ({ participantId, callType, channelId }, { rejectWithValue, getState }) => {
        try {
            const { auth } = getState();
            const callerId = auth.user.id;

            // 1. ব্যাকএন্ড থেকে টোকেন fetch করুন
            const token = await fetchAgoraToken(channelId, callerId);
            
            const callData = {
                id: channelId, 
                callerId: callerId,
                participantId,
                callType, 
                token: token,
                status: 'calling',
                createdAt: new Date().toISOString(),
            };

            // 2. সকেটের মাধ্যমে প্রতিপক্ষকে আমন্ত্রণ জানান (সিগন্যালিং)
            socketService.sendCallInvitation({
                calleeId: participantId,
                channelId, 
                token, // প্রতিপক্ষের জন্য টোকেন
                callType
            });

            // 3. ⚠️ Agora জয়েনিং লজিকটি Redux থেকে বাদ দেওয়া হয়েছে।
            // এটি কম্পোনেন্টে/সার্ভিসে initiateCall.fulfilled এর পর হ্যান্ডেল হবে।

            return callData;

        } catch (error) {
            return rejectWithValue(error.message || 'Failed to initiate call');
        }
    }
);

export const acceptCall = createAsyncThunk (
    'call/accept',
    async ({ channelId, token, callerId, callType }, { rejectWithValue }) => {
        try {
            // 1. সকেটের মাধ্যমে প্রতিপক্ষকে জানান যে কল গ্রহণ করা হয়েছে (সিগন্যালিং)
            socketService.sendCallAccepted(callerId, channelId);

            // 2. ⚠️ Agora জয়েনিং লজিকটি Redux থেকে বাদ দেওয়া হয়েছে।
            // এটি কম্পোনেন্টে/সার্ভিসে acceptCall.fulfilled এর পর হ্যান্ডেল হবে।

            return { 
                channelId, 
                token, 
                callType, 
                acceptedAt: new Date().toISOString() 
            };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to accept call');
        }
    }
);

export const declineCall = createAsyncThunk(
    'call/decline',
    async ({ callId, participantId }, { rejectWithValue }) => {
        try {
            // সকেটের মাধ্যমে প্রতিপক্ষকে জানান (সিগন্যালিং)
            socketService.sendCallDecline(participantId, callId);
            // ⚠️ agoraService.leaveCall() কম্পোনেন্টে/সার্ভিসে কল হবে।
            return { callId, declinedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to decline call');
        }
    }
);

export const endCall = createAsyncThunk(
    'call/end',
    async ({ callId, participantId }, { rejectWithValue }) => {
        try {
            // সকেটের মাধ্যমে প্রতিপক্ষকে জানান (সিগন্যালিং)
            socketService.sendCallEnd(participantId, callId);
            // ⚠️ agoraService.leaveCall() কম্পোনেন্টে/সার্ভিসে কল হবে।
            return { callId, endedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to end call');
        }
    }
);

// --- Call Slice Reducer (আগের মতো) ---
const callSlice = createSlice({
    name: 'call',
    initialState: {
        activeCall: null,
        callHistory: [],
        isCallModalOpen: false,
        callStatus: 'idle',
        callType: null,
        callDuration: 0,
        caller: null,
        participant: null,
        isMuted: false,
        isVideoEnabled: true,
        isSpeakerOn: false,
        isCameraLoading: false,
        cameraError: null,
        isMinimized: false,
        showControls: true,
        localStream: null,           // MediaStream (লোকাল রেন্ডারিং এর জন্য)
        remoteUsers: [],             // রিমোট ইউজারদের ট্র্যাক রেফারেন্স
        remoteStreamReady: false,    
        isConnected: false,
        loading: false,
        error: null,
    },
    reducers: {
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
        },
        setCallStatus: (state, action) => {
            state.callStatus = action.payload;
            if (action.payload === 'connected') {
                state.callDuration = 0;
            }
        },
        // Agora Media State Reducers
        setLocalStream: (state, action) => {
            state.localStream = action.payload;
        },
        setRemoteUsers: (state, action) => {
            state.remoteUsers = action.payload;
            state.remoteStreamReady = state.remoteUsers.length > 0;
        },
        receiveIncomingCall: (state, action) => {
            const callData = action.payload;
            state.activeCall = callData;
            state.isCallModalOpen = true;
            state.callStatus = 'ringing';
            state.callType = callData.callType;
            state.caller = callData.caller ?? 'Unknown Caller'; 
            state.isMinimized = false;
        },
        incrementCallDuration: (state) => {
            if (state.callStatus === 'connected') {
                state.callDuration += 1;
            }
        },
        toggleMute: (state) => {
            // ⚠️ কম্পোনেন্টে agoraService.toggleMute() কল করতে হবে
            state.isMuted = !state.isMuted;
        },
        toggleVideo: (state) => {
            // ⚠️ কম্পোনেন্টে agoraService.toggleVideo() কল করতে হবে
            state.isVideoEnabled = !state.isVideoEnabled;
        },
        toggleSpeaker: (state) => {
            state.isSpeakerOn = !state.isSpeakerOn;
        },
        setCameraLoading: (state, action) => {state.isCameraLoading = action.payload;},
        setCameraError: (state, action) => {state.cameraError = action.payload;state.isCameraLoading = false;},
        toggleMinimize: (state) => {state.isMinimized = !state.isMinimized;},
        setShowControls: (state, action) => {state.showControls = action.payload;},
        setSocketConnected: (state, action) => {state.isConnected = action.payload;},
        addToCallHistory: (state, action) => {
            state.callHistory.unshift(action.payload);
            if (state.callHistory.length > 50) {state.callHistory = state.callHistory.slice(0, 50);}
        },
        clearError: (state) => {state.error = null;},
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
            state.localStream = null;
            state.remoteUsers = []; 
            state.remoteStreamReady = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(initiateCall.pending, (state) => {state.loading = true;state.error = null;})
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
            .addCase(acceptCall.pending, (state) => {state.loading = true;state.callStatus = 'connecting';})
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
            .addCase(declineCall.fulfilled, (state, action) => {
                state.callStatus = 'ended';
                state.isCallModalOpen = false;
                state.activeCall = null;
            })
            .addCase(endCall.fulfilled, (state, action) => {
                state.callStatus = 'ended';
                state.isCallModalOpen = false;
                state.activeCall = null;
                state.callDuration = 0;
                state.isMinimized = false;
                state.showControls = true;
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
    setRemoteUsers, 
    setRemoteStreamReady,
    setSocketConnected,
    receiveIncomingCall,
    addToCallHistory,
    clearError,
    resetCallState,
} = callSlice.actions;

export default callSlice.reducer;