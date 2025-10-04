// src/services/socket.js
import { io } from "socket.io-client";
import store from '../store/store';
import { setOnlineUsers, addMessage, updateMessageStatus, setTyping } from '../store/slices/chatSlice';
import { toast } from 'react-hot-toast';
import {
    receiveIncomingCall,
    setCallStatus,
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleICECandidate,
    setSocketConnected,
    closeCallModal,
    addToCallHistory,
    setPeerConnection,
    setRemoteStream,
    setRemoteStreamReady,
    resetCallState, setLocalStream
} from '../store/slices/callSlice';
import { getTurnCredentials } from '../api/auth';

// Node.js server এর URL
const BASE_API_URL = import.meta.env.VITE_API_BASE || "https://chatbd.live/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

class SocketService {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
    }
    // STUN সার্ভার কনফিগারেশন (NAT traversal এর জন্য দরকার হয়)
    // config = {
    //     iceServers: [
    //         { urls: 'stun:stun.l.google.com:19302' },
    //         { urls: 'stun:stun1.l.google.com:19302' },
    //         {
    //             urls: 'turn:ws.chatbd.live:3478?transport=tcp',
    //             username: 'testuser',
    //             credential: 'testpass'
    //         }
    //     ],
    //     iceTransportPolicy: 'relay',
    //     iceCandidatePoolSize: 0,
    // };
    async getIceServerConfig() {
        try {
            const iceServersArray = await getTurnCredentials();
            console.log('response comes from Xirsys', iceServersArray)

            return {
                iceServers: [iceServersArray],
                iceCandidatePoolSize: 0,
            };

        } catch (error) {
            console.error("Error fetching TURN credentials from Laravel backend:", error);
            return {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    {
                        urls: 'turn:ws.chatbd.live:3478?transport=tcp',
                        username: 'testuser',
                        credential: 'testpass'
                    }
                ],
                iceTransportPolicy: 'all',
                iceCandidatePoolSize: 0,
            };
        }
    }
    connect(userId) {
        // Connect to backend Socket.IO server
        this.socket = io(SOCKET_URL, {
            auth: { userId },
            withCredentials: true,
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            this.socket.emit('addUser', userId);
        });

        // Listen online users
        this.socket.on('onlineUsers', (users) => {
            store.dispatch(setOnlineUsers(users));
        });

        // Listen new message
        this.socket.on('private_message', (msg) => {
            store.dispatch(addMessage(msg));
        });

        // Listen message status updates
        this.socket.on('messageStatus', ({ messageId, status }) => {
            store.dispatch(updateMessageStatus({ messageId, status }));
        });

        // Typing
        this.socket.on('typing', ({ chatId, senderId, typing }) => {
            store.dispatch(setTyping({ chatId, senderId, typing }));
        });

        // Incoming call
        this.socket.on('callInitiated', (data) => {
            store.dispatch(receiveIncomingCall(data));
            this.socket.emit('callRinging', { callerId: data.callerId })
            // this.handleOffer(data.callerId, data.offer, data.callType === 'video')
        });

        // Caller side
        this.socket.on('callRinging', () => {
            console.log('call ringing');
            store.dispatch(setCallStatus('ringing'));
        });
        // ধরে নিন: এই কোডটি আপনার ক্লাসের ইনস্ট্যান্স তৈরি হওয়ার পর রান করছে।
        // socketService হলো আপনার WebRTCSocketService ক্লাসের ইনস্ট্যান্স।

        this.socket.on('webrtcAnswer', async (data) => {
            console.log('Received WebRTC Answer:', data);

            // ১. নিশ্চিত করা যে PeerConnection তৈরি আছে
            if (!this.peerConnection) {
                console.error('PeerConnection not established for receiving answer.');
                return;
            }

            // ২. Answer-টিকে রিমোট ডেসক্রিপশন হিসেবে সেট করা
            try {
                await this.peerConnection.setRemoteDescription(data.answer);
                // ৩. কল সফলভাবে সেটআপ হলে স্ট্যাটাস আপডেট করা
                // store.dispatch(setCallStatus('connected'));
                console.log('WebRTC connection established! Waiting for ICE candidates to complete.');
            } catch (error) {
                console.error('Error setting remote description (Answer):', error);
                // store.dispatch(setCallError('Failed to finalize call setup.'));
            }
        });


        this.socket.on('iceCandidate', async ({ from, candidate }) => {
            // যখন সকেটে একটি ICE Candidate মেসেজ আসে, তখন এই ফাংশনটি কল করা হয়।
            await this.handleIceCandidate(candidate);
        });

        // Call ended
        this.socket.on('callEnded', () => {
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            store.dispatch(resetCallState());
        });

    }
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    sendMessage(chatId, message) {
        this.socket?.emit('sendMessage', { chatId, message });
    }

    startTyping(chatId, senderId, receiverIds) {
        console.log('socket chatId', chatId)
        this.socket?.emit('startTyping', chatId, senderId, receiverIds);
    }

    stopTyping(chatId, senderId, receiverIds) {
        this.socket?.emit('stopTyping', chatId, senderId, receiverIds);
    }

    // UI-এর জন্য Getter
    getRemoteStream() {
        return this.remoteStream;
    }

    // লোকাল ক্যামেরা ও মাইক্রোফোন থেকে stream নেওয়া
    async initLocalStream(video = true) {
        try {
            if (!this.localStream) { // ডুপ্লিকেট অ্যাক্সেস এড়াতে
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video,   // যদি ভিডিও কল হয় তাহলে true
                    audio: true, // সবসময় অডিও true
                });
                store.dispatch(setLocalStream(this.localStream));
            }
            return this.localStream;
        } catch (err) {
            console.error('Error accessing media devices', err);
        }
    }

    // ডুপ্লিকেশন এড়াতে সাধারণ WebRTC সেটআপ লজিক
    async _setupPeerConnection(isCaller, participantId) {
        const dynamicConfig = await this.getIceServerConfig();
        this.peerConnection = new RTCPeerConnection(dynamicConfig);
        this.remoteStream = new MediaStream();

        // লোকাল ট্র্যাক যোগ করা
        this.localStream.getTracks().forEach((track) => {
            console.log('track =>', track)
            console.log('track =>', this.localStream)
            this.peerConnection.addTrack(track, this.localStream);
        });

        // ontrack হ্যান্ডলার সেট করা
        this.peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                console.log('stream asche => ', event.streams[0])
                // ১. socketService-এর remoteStream property আপডেট করুন
                this.remoteStream = event.streams[0];
            }
            // ২. Redux-এ ডিসপ্যাচ করে UI-কে জানান যে রিমোট স্ট্রিম ব্যবহারের জন্য প্রস্তুত
            store.dispatch(setRemoteStreamReady(true));
        };

        // ICE candidate হ্যান্ডলার সেট করা
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('onicecandidate call hoyche => ', event.candidate)
                this.socket.emit('iceCandidate', {
                    to: participantId,
                    callerId: isCaller ? store.getState().auth.user?.id : null,
                    candidate: event.candidate,
                });
            }
        };

        // 💡 নতুন সংযোজন: ICE সংযোগের অবস্থার পরিবর্তন পর্যবেক্ষণ
        this.peerConnection.oniceconnectionstatechange = () => {
            const currentState = this.peerConnection.iceConnectionState;
            console.log('ICE Connection State Changed:', currentState);

            // 'connected' বা 'completed' মানেই P2P সংযোগ তৈরি
            if (currentState === 'connected' || currentState === 'completed') {
                store.dispatch(setCallStatus('connected'));
                console.log('ICE: Connection Successful. Call status set to connected.');

            } else if (currentState === 'failed') {
                // সংযোগ বিচ্ছিন্ন হলে বা ব্যর্থ হলে
                console.error('ICE Connection Failed! Ending call.');
                this.endCall(participantId);
            }
        };
    }

    async initiateCall(receiverId, callType = 'video') {
        try {
            store.dispatch(setCallStatus('calling')); // কল স্ট্যাটাস আপডেট হলো
            const videoEnabled = callType === 'video';
            console.log('videoEnabled', videoEnabled)
            await this.initLocalStream(videoEnabled);
            await this._setupPeerConnection(true, receiverId);

            // Caller একটা Offer তৈরি করবে
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // সার্ভারে কল ইভেন্ট পাঠানো হলো
            this.socket.emit('callInitiated', {
                receiverId: receiverId,
                callerId: store.getState().auth.user?.id,
                callType,
                offer,
            });

        } catch (error) {
            console.log('error', error)
        }
    }
    async handleOffer(callerId, offer, isVideoCall = true) {
        try {
            await this.initLocalStream(isVideoCall);
            await this._setupPeerConnection(false, callerId); // নতুন হেল্পার মেথড ব্যবহার
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.socket.emit('webrtcAnswer', {
                callerId: callerId,
                answer,
            });
            store.dispatch(setCallStatus('connecting'));
        } catch (error) {
            console.error('Failed to handle offer:', error);
            // store.dispatch(setCallError('Failed to connect call.'));
        }
    }

    // ৩. ICE Candidate যোগ করা
    async handleIceCandidate(candidate) {
        try {
            if (this.peerConnection && candidate) {
                console.log('this.peerConnection && candidate =>', this.peerConnection && candidate)
                await this.peerConnection.addIceCandidate(candidate);
            }
        } catch (error) {
            console.error('Error adding received ICE candidate:', error);
        }
    }
    endCall(toUserId) {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        store.dispatch(setLocalStream(null));
        store.dispatch(resetCallState());
        // UI এবং রিসিভারকে জানানোর জন্য
        this.socket?.emit('callEnded', toUserId);
        // store.dispatch(resetCallState());
    }
}
export const socketService = new SocketService();
export default socketService;