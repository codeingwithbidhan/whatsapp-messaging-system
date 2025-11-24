import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import socketService from '../../socket/socket';
import { fetchAgoraToken } from '../../api/chat';
import { agoraStore } from '../../lib/AgoraStore';
import store from '../store';

// Async thunks for call operations
export const initiateCall = createAsyncThunk(
  'agoraCall/initiate', 
  async ({ participant,caller, callType, channelId, activeChat }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const callerId = auth.user.id;
      const participantId = participant?.id;


      // 1. ব্যাকএন্ডে রিকোয়েস্টের জন্য ডেটা
      const tokenData = { 
        channelName: channelId, 
        callerId: callerId, // কলার টোকেন তৈরির জন্য
        receiverId: participantId // রিসিভার টোকেন তৈরির জন্য
      };

      // 2. ব্যাকএন্ড থেকে দ্বৈত টোকেন fetch করুন
      const response = await fetchAgoraToken(tokenData);
      const tokens = response.data; // আশা করা হচ্ছে: { callerToken, receiverToken }

      // 3. টোকেন অনুপস্থিত থাকলে ত্রুটি হ্যান্ডেল করুন
      if (!tokens || !tokens.callerToken || !tokens.receiverToken) {
        console.error("Token generation failed or response incomplete.", tokens);
        return rejectWithValue('Failed to receive valid tokens from server.');
      }
      
      // 4. বেস কল ডেটা তৈরি করুন (যা কলারের Redux State এ যাবে)
      
      const baseCallData = {
        callerId: callerId, 
        receiverId: participantId,
        chatId: activeChat,
        channelName: channelId,
        callType, 
        status: 'calling',
        created_at: new Date().toISOString(),
      };
      
      // 5. কলারের জন্য ফাইনাল ডেটা (Caller Token সহ)
      const callDataForCaller = {
        ...baseCallData,
        participant: participant,
        token: tokens.callerToken, // কলার তার নিজস্ব টোকেন ব্যবহার করবে
      };
      
      // 6. রিসিভারের জন্য সিগন্যালিং ডেটা (Receiver Token সহ)
      const signalDataForReceiver = {
        ...baseCallData,
        caller: caller,
        // সিগন্যালিং ডেটাতে রিসিভারের টোকেনটি পাঠানো হলো
        token: tokens.receiverToken, 
      };
      
      // 7. সকেটের মাধ্যমে প্রতিপক্ষকে আমন্ত্রণ জানান (সিগন্যালিং)
      socketService.agoraCallRequest(signalDataForReceiver);

      // 8. Redux state আপডেট করার জন্য কলারের ডেটা ফেরত দিন
      return callDataForCaller;
      
    } catch (error) {
      // যদি নেটওয়ার্ক বা API কল ব্যর্থ হয়
      console.error("Initiate Call Thunk Error:", error);
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
            console.log('accept call callId =>', callId);
            return { callId, acceptedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to accept call');
        }
    }
);

export const declineCall = createAsyncThunk(
    'call/decline',
    async ({ rejectWithValue }) => {
        try {
            store.dispatch(resetCallState());
            // return { callId, declinedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to decline call');
        }
    }
);

export const endCall = createAsyncThunk(
    'call/end',
    async ({ rejectWithValue }) => {
        try {

            store.dispatch(resetCallState());
            
            // // ১. AgoraStore থেকে লোকাল ট্র্যাক অবজেক্টগুলো উদ্ধার করা
            // const rtcClient = agoraStore.get('rtcClient');
            // const localVideoTrack = agoraStore.get('localVideoTrack');
            // const localAudioTrack = agoraStore.get('localAudioTrack');
            
            // try {
            //     if (localVideoTrack) {
            //         localVideoTrack.close();
            //         localVideoTrack.stop();
            //     }
            //     if (localAudioTrack) {
            //         localAudioTrack.close();
            //         localAudioTrack.stop();
            //     }
            // } catch (e) {
            //     console.error("Error closing local tracks:", e);
            //     cleanupSuccessful = false;
            // }

            // if (rtcClient) {
            //     try {
            //         await rtcClient.leave(); 
            //     } catch (error) {
            //         console.warn("Error leaving Agora channel (Might be already left, proceeding to cleanup):", error);
            //     }
            // }

            // agoraStore.clearAll();

            // console.log('Call cleanup complete. Redux state dispatched.');

            // return { callId, endedAt: new Date().toISOString() };
            return 
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
        isCallModalOpen: false,
        callStatus: 'idle', // idle, calling, ringing,busy, connecting, connected, ended, failed
        callType: null, // voice, video
        callDuration: 0,

        // Call history
        callHistory: [],

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

        // WebRTC states: Now stores Agora Track ID (string) or null
        localVideoTrackId: null, 
        localAudioTrackId: null, 
        remoteVideoTrackId: null,
        remoteAudioTrackId: null,
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

        // Agora
        /**
        * @param {Object} action.payload
        * @param {import('agora-rtc-sdk-ng').ILocalTrack | null} action.payload.videoTrack
        * @param {import('agora-rtc-sdk-ng').ILocalTrack | null} action.payload.audioTrack
        */
        setLocalTracks: (state, action) => {
            const { videoTrack, audioTrack } = action.payload;
            
            // 1. Local Video Track
            if (videoTrack) {
                // আসল ট্র্যাক অবজেক্ট AgoraStore-এ সেভ করা হলো
                agoraStore.set('localVideoTrack', videoTrack);
                
                // Redux Store-এ শুধু ID সেভ করা হলো
                state.localVideoTrackId = videoTrack._ID;
            } else {
                agoraStore.set('localVideoTrack', null);
                state.localVideoTrackId = null;
            }

            // 2. Local Audio Track
            if (audioTrack) {
                // আসল ট্র্যাক অবজেক্ট AgoraStore-এ সেভ করা হলো
                agoraStore.set('localAudioTrack', audioTrack);
                
                // Redux Store-এ শুধু ID সেভ করা হলো
                console.log('audioTrack._ID', audioTrack._ID);
                
                state.localAudioTrackId = audioTrack._ID;
            } else {
                agoraStore.set('localAudioTrack', null);
                state.localAudioTrackId = null;
            }

            console.log('Local Track IDs saved in Redux:', { 
                video: state.localVideoTrackId, 
                audio: state.localAudioTrackId 
            });
        },
        setRemoteTracks: (state, action) => {
            const { videoTrack } = action.payload;                    
            
            // 1. Local Video Track
            if (videoTrack) {                
                // আসল ট্র্যাক অবজেক্ট AgoraStore-এ সেভ করা হলো
                agoraStore.set('remoteVideoTrack', videoTrack);
                
                // Redux Store-এ শুধু ID সেভ করা হলো
                state.remoteVideoTrackId = videoTrack._ID;
            } else {
                agoraStore.set('remoteVideoTrack', null);
                state.remoteVideoTrackId = null;
            }
        },

        // WebRTC stream management
        // setLocalStream: (state, action) => {
        //     console.log('local stream test form redux => ', action.payload)
        //     state.localStream = action.payload;
        // },

        // setRemoteStream: (state, action) => {
        //     // state.remoteStream = action.payload;
        //     const { videoTrack, uid } = action.payload;
        //     state.remoteStream[uid].videoTrack = videoTrack;
        // },

        // setRemoteStreamReady: (state, action) => {
        //     state.remoteStreamReady = action.payload;
        // },

        // setPeerConnection: (state, action) => {
        //     state.peerConnection = action.payload;
        // },

        // // Socket connection
        // setSocketConnected: (state, action) => {
        //     state.isConnected = action.payload;
        // },

        // Incoming call handling
        receiveIncomingCall: (state, action) => {
            const callData = action.payload;
            state.activeCall = callData;
            state.isCallModalOpen = true;
            state.callStatus = 'ringing';
            state.callType = callData.callType;
            state.participant = callData.participant ?? '';
            state.isMinimized = false;
        },

        /**
        * ইনকামিং কল রিসিভ করার পর স্ট্যাটাস পরিবর্তন করে
        * Agora-তে জয়েন করার জন্য তৈরি করা হবে।
        */
        acceptCall: (state) => {
            if (state.activeCall && state.callStatus === 'ringing') {
                // স্ট্যাটাস connecting করে দেওয়া হলো। 
                // এবার Hook বা Component Agora জয়েন করার প্রক্রিয়া শুরু করবে।
                state.callStatus = 'connecting';
                // state.isCallModalOpen = false; // রিংগিং মডাল বন্ধ করা হলো
                console.log('Call accepted. Status changed to connecting.');
            }
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
            store.localVideoTrackId = null;
            store.localAudioTrackId = null;
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
                state.participant = action.payload.participant
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

            // // Decline Call
            // .addCase(declineCall.fulfilled, (state, action) => {
            //     console.log('decline fullfiled', action.payload)
            //     state.callStatus = 'idle';
            //     state.isCallModalOpen = false;
            //     state.activeCall = null;
            //     state.participant = null;
            // })

            // // End Call
            // .addCase(endCall.fulfilled, (state, action) => {
            //     // Reset call state
            //     state.activeCall = null;
            //     state.callStatus = 'idle';
            //     state.isCallModalOpen = false;
            //     state.callDuration = 0;
            //     state.isMinimized = false;
            //     state.showControls = true;
            //     state.isMuted = false;
            //     state.isVideoEnabled = true;
            //     state.isSpeakerOn = false;
            //     state.cameraError = null;
            //     state.isCameraLoading = false;
            //     store.localVideoTrackId = null;
            //     store.localAudioTrackId = null;
            // });
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
    setLocalTracks,
    setRemoteTracks,
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