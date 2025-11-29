// src/services/socket.js
import { io } from "socket.io-client";
import AgoraRTC from 'agora-rtc-sdk-ng';
import store from '../store/store';
import { setOnlineUsers, receiveNewMessage, updateMessageStatus, setTyping, fetchChats } from '../store/slices/chatSlice';
import { toast } from 'react-hot-toast';
import {
    receiveIncomingCall,
    setCallStatus,
    endCall,
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleICECandidate,
    setSocketConnected,
    closeCallModal,
    addToCallHistory,
    setPeerConnection,
    setRemoteStream,
    setRemoteStreamReady,
    resetCallState, setLocalStream,
    setRemoteTracks
} from '../store/slices/callSlice';
import { getTurnCredentials } from '../api/auth';

// Node.js server এর URL
const BASE_API_URL = import.meta.env.VITE_API_BASE || "https://chatbd.live/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;


// Agora State Management
const APP_ID="cd227da9d01d405c9d34a2cf6452c6e8"; // 💡 আপনার নিজের Agora App ID এখানে দিন
const LOG_LEVEL = "info";
let agoraClient = null;
let localTracks = [];
let remoteUsers = {}; // দূরবর্তী ব্যবহারকারীদের ট্র্যাক করার জন্য

class SocketService {
    constructor() {
        this.socket = null;
        this.localStream = null;

        this.peerConnection = null;
        this.remoteStream = null;

        this.isMuted = false;
    }

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

        this.socket.on('addContact', () => {
            console.log('from chat slice receiver end');
            store.dispatch(fetchChats());
        });

        // Listen new message
        this.socket.on('private_message', (msg, callback) => {
            if (callback) {
                callback(); 
            }
            console.log('msg', msg)
            // store.dispatch(addMessage(msg));
            store.dispatch(receiveNewMessage(msg));
        });

        // Listen message status updates
        this.socket.on('messageStatus', ({ messageId, status }) => {
            console.log('message Ids, status after delivery', messageId, status);
            store.dispatch(updateMessageStatus({ messageId, status }));
        });

        // Typing
        this.socket.on('typing', ({ chatId, senderId, typing }) => {
            store.dispatch(setTyping({ chatId, senderId, typing }));
        });

        // Agora call start.
        this.socket.on('incomingCall', (data) => {
            store.dispatch(receiveIncomingCall({
                channelName: data.channelName,
                callerId: data.callerId,
                callerName: data.callerName,
                callType: data.callType,
                token: data.token, // কলারের টোকেন
                chatId: data.chatId,
                participant: data.caller,
                status: 'Ringing',
            }));
        });

        this.socket.on('callDeclinedOrEnd', (data) => {
            // const status = data.type === 'declined' ? `declined` : 'Call ended';
            store.dispatch(setCallStatus(status));

            setTimeout( async () => {
                await this.destroyAndCleanup();
                store.dispatch(resetCallState());
            }, 2000);
        });

        
        // 5. কলারের জন্য কল কানেক্টেড নিশ্চিতকরণ
        this.socket.on('callConnected', (data) => {
            console.log('Call established successfully:', data);
            
            // Redux-এ কল স্ট্যাটাস 'connected' এ পরিবর্তন করা হলো
            store.dispatch(setCallStatus('connected'));
            
            // 💡 ঐচ্ছিকভাবে, আপনি এখানে একটি নোটিফিকেশন দেখাতে পারেন যে কল সফল হয়েছে।
            // data.participantId বা data.channelName ব্যবহার করে আপনি নিশ্চিত করতে পারেন।
        });

        // ===========================================
        // B. কলারের জন্য: অফলাইন স্ট্যাটাস শোনা ('callStatusUpdate')
        // ===========================================
        this.socket.on('callStatusUpdate', (data) => {
            store.dispatch(setCallStatus(data.status));
            if (data.status === 'offline') {
                setTimeout( async () => {
                    await this.destroyAndCleanup();
                    store.dispatch(resetCallState());
                }, 2000);
            }
        });

    }
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // ===========================
    // Messaging
    // ===========================

    sendMessage(chatId, message) {
        this.socket?.emit('sendMessage', { chatId, message });
    }

    makeAsDelivery({chatId, notifySendersDeliveredMessage}) {
        console.log('notifySendersDeliveredMessage form socket', notifySendersDeliveredMessage);
        this.socket?.emit('makeAsDelivered', { chatId, notifySendersDeliveredMessage });
    }

    markAsSeen(chatId, viewerId, notifyReceiverIds) {
        console.log('chatId viewerId notifyReceiverIds', chatId, viewerId, notifyReceiverIds);
        this.socket?.emit('markAsSeen', { chatId, viewerId, notifyReceiverIds });
    }

    startTyping(chatId, senderId, receiverIds) {
        console.log('socket chatId', chatId)
        this.socket?.emit('startTyping', chatId, senderId, receiverIds);
    }

    stopTyping(chatId, senderId, receiverIds) {
        this.socket?.emit('stopTyping', chatId, senderId, receiverIds);
    }

    
    // ===========================
    // add chat
    // ===========================

    addContact (partnerId) {
        console.log('from socket', partnerId);
        this.socket?.emit('addContact', { partnerId });
    }

    // ===========================
    // Media
    // ===========================

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

    agoraCallRequest (callData) {
        if (this.socket) {
            this.socket.emit('agoraCallRequest', callData, (response) => {
                // সার্ভার থেকে প্রাপ্ত Acknowledgement (ঐচ্ছিক)
                if (response && response.success) {
                } else if (response && response.error) {
                    console.error("Server reported an error during call request:", response.error);
                }
            });
        } else {
            console.error("Socket not connected. Cannot send call request.");
        }
    }

    /**
    * চ্যানেল জয়েন করা এবং লোকাল স্ট্রিম পাবলিশ করা।
    * এটি আপনার useEffect লজিক থেকে কল করা হবে।
    * @returns { Promise<AgoraRTCTrack[]> } লোকাল ট্র্যাক অ্যারে রিটার্ন করে।
    */
    async startCallAndPublish (channelId, uid, token, callType) {

        // CRITICAL FIX: নতুন করে জয়েন করার আগে পুরাতন ক্লায়েন্টকে সম্পূর্ণভাবে ধ্বংস ও ক্লিনআপ করুন।
        await this.destroyAndCleanup();

        // ১. নতুন Agora ক্লায়েন্ট ইনস্ট্যান্স তৈরি করা (সিঙ্গলটন বাতিল)
        agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        // console.log("A fresh Agora client initialized for new call.");

        // ২. নতুন ক্লায়েন্টে ইভেন্ট লিসেনার যুক্ত করা
        agoraClient.on("user-published", this.handleUserPublished.bind(this));
        agoraClient.on("user-unpublished", this.handleUserUnpublished.bind(this));
        agoraClient.on("user-joined", this.handleUserJoined.bind(this));
        agoraClient.on("user-left", this.handleUserLeft.bind(this));
        
        // পুরানো ট্র্যাকগুলো বন্ধ ও পরিষ্কার করা (যদিও destroyAndCleanup এ করা হয়েছে, আবার চেক করা নিরাপদ)
        localTracks.forEach(track => track.close());
        localTracks = [];
        const tracksPromises = [];
        
        // **ধাপ ১: অডিও ট্র্যাক তৈরি**
        tracksPromises.push(AgoraRTC.createMicrophoneAudioTrack());

        // **ধাপ ২: ভিডিও ট্র্যাক তৈরি (শুধুমাত্র ভিডিও কলের জন্য)**
        if (callType === 'video') {
            try {
                const videoTrack = await AgoraRTC.createCameraVideoTrack();
                tracksPromises.push(Promise.resolve(videoTrack));
                console.log("Camera video track created successfully.");
            } catch (error) {
                // ক্যামেরা এক্সেস না পেলে অডিও দিয়ে চালিয়ে যাওয়া
                console.error("Camera access denied or device in use. Continuing with audio only.", error);
            }
        }

        // **ধাপ ৩: সমস্ত সফল ট্র্যাকের জন্য অপেক্ষা করা**
        const tracksResults = await Promise.allSettled(tracksPromises);

        localTracks = tracksResults
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);
        
        if (localTracks.length === 0) {
            // যদি কোনো ট্র্যাকই তৈরি না হয় (যেমন মাইক্রোফোনও না পায়)
            await this.destroyAndCleanup();
            throw new Error("Failed to create any local tracks. Check microphone/camera access.");
        }

        // ৪. চ্যানেলে জয়েন করা
        const numericUid = String(uid); 
        await agoraClient.join(APP_ID, channelId, token, numericUid);
        
        console.log(`Successfully joined channel ${channelId} with UID ${uid}`);

        // ৫. লোকাল ট্র্যাক পাবলিশ করা
        await agoraClient.publish(localTracks);
        
        // console.log("Local tracks published:", localTracks.map(t => t.trackMediaType));
        
        return localTracks;
    }

    // ==========================================================
    // ৪. leaveCall ফাংশন (Call End লজিকের জন্য)
    // ==========================================================
    // এই ফাংশনটি আপনার declineCallThunk বা endCall অ্যাকশনে কল করা উচিত
    async leaveCall() {
        console.log("Initiating call leave sequence.");
        await this.destroyAndCleanup();
        console.log("Call resources successfully cleaned up.");
        // Redux state update (যদি প্রয়োজন হয়)
    }    

    async declineOrEndCall(callerId, participantName, type) {  
        if (this.socket) {
            this.socket.emit('callDeclinedOrEnd', { callerId: callerId, participantName: participantName, type: type });
        }   
        await this.destroyAndCleanup();
    };

    async endCall(receiverId) {
        // ১. অন্য ব্যবহারকারীকে কল শেষ হওয়ার সিগনালিং পাঠানো
        if (this.socket) {
            this.socket.emit('callEnd', { receiverId }); 
        }
        
        // ২. লোকাল মিডিয়া রিসোর্স পরিষ্কার করা
        await this.destroyAndCleanup();
        console.log("Local call media resources successfully cleaned up.");
    }

    answerCall(callerId, receiverId, channelName) {
        this.socket.emit('agoraCallAnswer', {
            callerId: callerId,
            receiverId: receiverId,
            channelName: channelName
        });
    }

    // ===========================
    // Toggle Audio/Video
    // ===========================
    async toggleAudio() {
        
        const audioTrack = localTracks.find(t => t.trackMediaType === 'audio');

        if (!audioTrack) {
            console.error("Local audio track not found. Cannot toggle mute.");
            return;
        }

        try {
            // ১. ইনস্ট্যান্সের স্ট্যাটাস টগল করুন (isMuted = !isMuted এর সমতুল্য)
            this.isMuted = !this.isMuted;
            
            // ২. নতুন স্ট্যাটাস localAudioTrack-এ প্রয়োগ করুন।
            // setEnabled(true) মানে আনমিউট (isMuted: false)
            // setEnabled(false) মানে মিউট (isMuted: true)
            // তাই, this.isMuted এর উল্টো ভ্যালু setEnabled-এ পাঠান: !this.isMuted
            await audioTrack.setEnabled(!this.isMuted);

        } catch (error) {
            console.error("Error toggling mute status:", error);
        }
    }

    toggleVideo(off) {
        const videoTrack = localTracks.find(t => t.hasVideo);
        if (videoTrack) {
            videoTrack.setEnabled(!off);
            return !off;
        }
        return false;
    }

    /**
     * কল ছেড়ে দেওয়া এবং ট্র্যাক বন্ধ করা।
     */
    async leaveCall() {
        if (!agoraClient) return;

        localTracks.forEach(track => track.close());
        localTracks = [];
        
        await agoraClient.leave();
        console.log("Successfully left the channel.");
    }


    // ===========================
    // Agora Events
    // ===========================

    async destroyAndCleanup() {
        if (agoraClient) {
            console.log("Cleaning up and destroying existing Agora client...");
            try {
                // ১. ক্লায়েন্টকে চ্যানেল ত্যাগ করতে বাধ্য করা
                await agoraClient.leave(); 
            } catch (e) {
                console.log("Error during client.leave, likely already left or stuck. Proceeding with track cleanup.");
            }
            
            // ২. লোকাল ট্র্যাক বন্ধ করা
            localTracks.forEach(track => track.close());
            localTracks = [];
            
            // ৩. রিমোট ইউজার এবং গ্লোবাল ক্লায়েন্ট রেফারেন্স মুছে ফেলা
            Object.keys(remoteUsers).forEach(key => delete remoteUsers[key]);
            agoraClient = null; // গ্লোবাল রেফারেন্স সাফ করা
            
            // ৪. Redux স্টেট পরিষ্কার করা (আপনার Redux লজিক অনুযায়ী)
            // store.dispatch(resetAgoraState()); // যদি আপনার এমন কোনো অ্যাকশন থাকে
        }
    }

    async handleUserPublished(user, mediaType) {
        console.log('handleUserPublished=>', user, mediaType);
        
        await agoraClient.subscribe(user, mediaType);

        if (mediaType === "video") {
            console.log(`Remote video published by ${user.uid}.`);
            store.dispatch(setRemoteTracks({ videoTrack: user.videoTrack }));
        }

        if (mediaType === "audio") {
            user.audioTrack.play();
            console.log(`Remote audio published by ${user.uid}.`);

        }

        remoteUsers[user.uid] = user;
    }

    handleUserUnpublished(user) {
        delete remoteUsers[user.uid];
    }

    handleUserJoined(user) {
        console.log("User joined:", user.uid);
    }

    handleUserLeft(user) {
        console.log("User left:", user.uid);
        delete remoteUsers[user.uid];
    }
}
export const socketService = new SocketService();
export default socketService;