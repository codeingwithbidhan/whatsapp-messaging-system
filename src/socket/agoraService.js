// src/agora/agoraService.js

import AgoraRTC from 'agora-rtc-sdk-ng';

// ⚠️ এখানে আপনার আসল Agora App ID দিন।
const APP_ID = 'cd227da9d01d405c9d34a2cf6452c6e8'; 

class AgoraService {
    constructor() {
        // ১. Agora ক্লায়েন্ট ইনিশিয়ালাইজ করুন
        this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        
        // ২. লোকাল ট্র্যাক সংরক্ষণের জন্য ভ্যারিয়েবল
        this.localAudioTrack = null;
        this.localVideoTrack = null;
        this.remoteUsers = new Map(); // {uid: {audioTrack, videoTrack}}

        // ৩. রিমোট ইভেন্ট হ্যান্ডলার সেট আপ
        this.client.on("user-published", this._handleUserPublished);
        this.client.on("user-unpublished", this._handleUserUnpublished);
        this.client.on("user-left", this._handleUserLeft);
        
        // 💡 আপনার কম্পোনেন্ট যেনো জানতে পারে যে কোনো রিমোট ইউজার যুক্ত হয়েছে বা স্ট্রিম প্রকাশ করেছে, 
        // তার জন্য কাস্টম ইভেন্ট বা একটি কলব্যাক ফাংশন এখানে যুক্ত করা যেতে পারে।
        // এখন সরলতার জন্য ধরে নিচ্ছি, কল স্ট্যাটাস Redux/Parent Component হ্যান্ডেল করবে।
    }

    /**
     * চ্যানেলে যুক্ত হওয়া এবং ট্র্যাক পাবলিশ করার জন্য ব্যবহৃত
     * @param {string} channelId - কল রুম আইডি
     * @param {number | null} uid - আপনার ইউজার আইডি (ঐচ্ছিক, Agora নিজে তৈরি করতে পারে)
     * @param {string} token - আপনার ব্যাকএন্ড থেকে প্রাপ্ত সিকিউরিটি টোকেন
     * @param {string} callType - 'voice' বা 'video'
     * @returns {Promise<MediaStream>} লোকাল মিডিয়া স্ট্রিম
     */
    async startCallAndPublish(channelId, uid, token, callType = 'video') {
        try {
            // ১. চ্যানেলে যুক্ত হোন
            const localUid = await this.client.join(APP_ID, channelId, token, uid);
            console.log(`Agora: User ${localUid} joined channel ${channelId}`);

            // ২. লোকাল মিডিয়া ট্র্যাক তৈরি করুন
            // (ভিডিও কলের জন্য ভিডিও এবং অডিও, ভয়েস কলের জন্য শুধু অডিও)
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            if (callType === 'video') {
                this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
            }

            // ৩. ট্র্যাকগুলি পাবলিশ করুন
            const tracks = this.localVideoTrack 
                ? [this.localAudioTrack, this.localVideoTrack] 
                : [this.localAudioTrack];
                
            await this.client.publish(tracks);
            console.log("Agora: Local tracks published.");
            
            // Redux-এ ব্যবহার করার জন্য লোকাল স্ট্রিম তৈরি
            const streamTracks = [];
            if (this.localAudioTrack) streamTracks.push(this.localAudioTrack.getMediaStreamTrack());
            if (this.localVideoTrack) streamTracks.push(this.localVideoTrack.getMediaStreamTrack());
            
            return new MediaStream(streamTracks);

        } catch (error) {
            console.error("Agora Error during startCallAndPublish:", error);
            await this.leaveCall(); // ব্যর্থ হলে পরিষ্কার করুন
            throw error;
        }
    }
    
    /**
     * রিমোট ইউজার কল পাবলিশ করলে সাবস্ক্রাইব করুন
     */
    _handleUserPublished = async (user, mediaType) => {
        // সাবস্ক্রাইব
        await this.client.subscribe(user, mediaType);

        if (mediaType === 'audio') {
            user.audioTrack.play(); // অটোপ্লে সমস্যার জন্য সরাসরি প্লে করার চেষ্টা
            // রিমোট অডিও প্লে করার চেষ্টা Redux-এ isRemoteStreamReady সেট করার কাজ করবে
        }
        
        // রিমোট ট্র্যাকগুলি সংরক্ষণের জন্য লজিক
        this.remoteUsers.set(user.uid, {
            ...this.remoteUsers.get(user.uid),
            // আপনার CallModal.js এ ব্যবহার করার জন্য ট্র্যাক রেফারেন্স 
            videoTrack: user.videoTrack,
            audioTrack: user.audioTrack,
        });
        
        console.log(`Agora: Subscribed to user ${user.uid} (${mediaType}).`);
    }
    
    // ... অন্যান্য ইভেন্ট হ্যান্ডলার 
    _handleUserUnpublished = (user, mediaType) => {
        console.log(`Agora: User ${user.uid} unpublished ${mediaType}`);
        // এখানে আপনার UI/Redux থেকে ইউজার ট্র্যাক সরানোর লজিক যুক্ত করুন
    }

    _handleUserLeft = (user) => {
        console.log(`Agora: User ${user.uid} left the channel.`);
        this.remoteUsers.delete(user.uid);
        // এখানে আপনার UI/Redux থেকে ইউজার সরানোর লজিক যুক্ত করুন
    }

    // --- Control Methods ---

    async leaveCall() {
        if (this.localAudioTrack) {
            this.localAudioTrack.close();
            this.localAudioTrack = null;
        }
        if (this.localVideoTrack) {
            this.localVideoTrack.close();
            this.localVideoTrack = null;
        }
        
        this.remoteUsers.clear();
        await this.client.leave();
        console.log("Agora: Left the channel.");
    }
    
    toggleMute(isMuted) {
        if (this.localAudioTrack) {
            this.localAudioTrack.setEnabled(!isMuted);
            console.log(`Agora: Mute set to ${isMuted}`);
        }
    }

    toggleVideo(isVideoEnabled) {
        if (this.localVideoTrack) {
            this.localVideoTrack.setEnabled(isVideoEnabled);
            console.log(`Agora: Video set to ${isVideoEnabled}`);
        }
        // যদি স্থানীয় ভিডিও ট্র্যাক তৈরি না হয়ে থাকে, তাহলে এটিকে এখানে ইনিশিয়ালাইজ করার চেষ্টা করতে পারেন। 
        // তবে ভালো হবে এটি startCallAndPublish এর শুরুতে করাই।
    }
}

export const agoraService = new AgoraService();