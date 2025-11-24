import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import MessageArea from './MessageArea';
import { fetchChats } from '../../store/slices/chatSlice';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { socketService } from '../../socket/socket.js';
import CallModal from "./CallModal.jsx";
import busyTone from '../../sound/callbusy.mp3';
import ringingTone from '../../sound/callringing.mp3';

import {
  acceptCall,
  declineCall,
  endCall,
  toggleMute,
  toggleVideo,
  toggleSpeaker,
  toggleMinimize,
  setLocalTracks,
  incrementCallDuration,
  resetCallState
} from '../../store/slices/callSlice';

const Chat = () => {
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state) => state.ui);
  const { activeChat } = useSelector((state) => state.chat);


  const callModalRef = useRef(null);
  const callTimerRef = useRef(null);

  const ringingAudioRef = useRef(null);
  const busyAudioRef = useRef(null);


  const myUid = useSelector((state) => state.auth?.user?.id || state.auth?.userId || null);
  const { user } = useSelector((state) => state.auth);

  const { activeCall,isCallModalOpen, callStatus, callType, callDuration, isMuted, isVideoEnabled, isSpeakerOn, isMinimized,
  showControls, cameraError, isCameraLoading, remoteStreamReady, localStream, loading, participant,localVideoTrackId, remoteVideoTrackId } = useSelector((state) => state.call);

  useEffect(() => {
    dispatch(fetchChats());
    
    ringingAudioRef.current = new Audio(ringingTone);
    ringingAudioRef.current.loop = true;

    busyAudioRef.current = new Audio(busyTone);
    busyAudioRef.current.loop = false;
    
  }, [dispatch]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // On mobile, show sidebar by default when no chat is active
        dispatch(setSidebarOpen(!activeChat));
      } else {
        // On desktop, always show sidebar
        dispatch(setSidebarOpen(true));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch, activeChat]);

  // Mobile view logic
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    return (
      <div className="h-screen bg-gray-100 flex overflow-hidden">
        {/* Mobile: Show either sidebar or message area, not both */}
        {!activeChat || sidebarOpen ? (
          <div className="w-full">
            <Sidebar />
          </div>
        ) : (
          <div className="w-full">
            <MessageArea />
          </div>
        )}
      </div>
    );
  }
  useEffect(() => {

    const playRinging = () => {
      ringingAudioRef.current?.play().catch(()=>{});
    };

    const stopRinging = () => {
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
        ringingAudioRef.current.currentTime = 0;
      }
    };

    const playBusy = () => {
      busyAudioRef.current?.play().catch(()=>{});
    };

    const stopBusy = () => {
      if (busyAudioRef.current) {
        busyAudioRef.current.pause();
        busyAudioRef.current.currentTime = 0;
      }
    };
  
    // RINGING TONE
    if (callStatus === "ringing") {
      playRinging();
      stopBusy();
    } // BUSY TONE WHEN DECLINED OR ENDED
    else if (callStatus === "declined" || callStatus === "offline") {
      stopRinging();
      playBusy();
    } // ANY OTHER STATUS → STOP EVERYTHING
    else {
      stopRinging();
      stopBusy();
    }    

    // 1. যখন callStatus 'connected' হবে, তখন টাইমার শুরু করুন।
    if (callStatus === 'connected') {
      startCallTimer();
    }
    // 2. যখন callStatus 'ended' বা 'declined' হবে, তখন টাইমার বন্ধ করুন।
    else if (callStatus === 'idle' || callStatus === 'ended' || callStatus === 'declined') {
      stopCallTimer();
    }

    // cleanup function: কম্পোনেন্ট আনমাউন্ট হলে বা callStatus পরিবর্তন হলে টাইমার বন্ধ করবে
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      stopRinging();
      stopBusy();
    };
  }, [callStatus]);


  const handleAcceptCall = async () => {

    if (activeCall) {

      // 1. Redux স্টেট আপডেট করুন
      dispatch(acceptCall(activeCall.callerId));
      
      // 2. সার্ভারকে জানান যে কলটি ধরা হয়েছে
      socketService.answerCall(
        activeCall.callerId, 
        myUid,
        activeCall.channelName
      );

      try {
        
        // 3. Agora-তে জয়েন করুন এবং লোকাল ট্র্যাক তৈরি করুন (কলার সাইডের মতোই লজিক)
        // এখানে কলার যে ফাংশন ব্যবহার করেছিল, সেটাই ব্যবহার করতে হবে, তবে এবার activeCall.token ব্যবহার করে।
        const localTracks = await socketService.startCallAndPublish(
          activeCall.channelName,
          myUid, // রিসিভারের আইডি Agora UID হিসেবে ব্যবহৃত হবে
          activeCall.token, 
          activeCall.callType
        );

        // 4. লোকাল ট্র্যাক Redux-এ সেভ করুন (non-serializable track গুলো agoraStore এ যাবে)
        const audioTrack = localTracks[0];
        const videoTrack = activeCall.callType === 'video' ? localTracks[1] : null;

        dispatch(setLocalTracks({ videoTrack, audioTrack }));
        
        // 5. কলারের থেকে 'agoraCallAnswer' ইভেন্ট পাওয়ার পর সার্ভার যখন 'callConnected' ইভেন্ট পাঠাবে, 
        // তখন আপনার hook/listener স্বয়ংক্রিয়ভাবে callStatus: 'connected' সেট করবে।

      } catch (error) {
        console.error("Failed to join Agora as Receiver:", error);
        // ব্যর্থ হলে কল শেষ করার লজিক
        socketService.leaveCall();
        // ... অন্যান্য রিসেট লজিক ...
      }

      // try {
      //   const callerId = activeCall.callerId
      //   await dispatch(acceptCall(callerId)).unwrap();
      //   await socketService.handleOffer(activeCall.callerId, activeCall.offer, activeCall.callType === 'video');
      //   // startCallTimer();
      //   setTimeout(() => {
      //     if (callModalRef.current) {
      //       console.log('Attempting manual play via ref...');
      //       callModalRef.current.playRemoteStream();
      //     } else {
      //       console.error('CallModal Ref is null on accept!');
      //     }
      //   }, 50); // 50ms অপেক্ষা করুন DOM আপডেট হওয়ার জন্য
      // } catch (error) {
      //   console.error('Failed to accept call:', error);
      // }
    }
  };

  const handleDeclineCall = async () => {
    console.log('active call handleEndCall', activeCall);
    try {
      dispatch(resetCallState());
      const type='declined';
      socketService.declineOrEndCall(activeCall.callerId, user.name, type);
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleEndCall = async () => {
    console.log('active call handleEndCall', activeCall);
    
    try {  
      dispatch(resetCallState());
      const type='ended';
      socketService.declineOrEndCall(activeCall.participant.id, user.name, type);
    } catch (error) {
      console.error('Failed to call end:', error);
      socketService.destroyAndCleanup();
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      dispatch(incrementCallDuration());
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const handleToggleMute = () => {
    dispatch(toggleMute());
    socketService.toggleAudio();
  };

  const handleToggleVideo = () => {
    console.log('handleToggleVideo')
    dispatch(toggleVideo());
  };

  const handleToggleSpeaker = () => {
    console.log('handleToggleSpeaker')
    dispatch(toggleSpeaker());
  };

  const handleToggleMinimize = () => {
    console.log('handleToggleMinimize')
    dispatch(toggleMinimize());
  };

  // Desktop view (original layout)
  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <Sidebar />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChat ? (
          <MessageArea />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="bg-green-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-green-600 text-4xl font-bold">W</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Welcome to WhatsApp Web
              </h2>
              <p className="text-gray-600 max-w-md">
                Send and receive messages without keeping your phone online.
                Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
              </p>
            </div>
          </div>
        )}
        {/* Call Modal */}
        <CallModal
          ref={callModalRef}
          isOpen={isCallModalOpen}
          activeCall={activeCall}
          callType={callType}
          participant={participant}
          callStatus={callStatus}
          duration={callDuration}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onClose={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleSpeaker={handleToggleSpeaker}
          onToggleMinimize={handleToggleMinimize}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isSpeakerOn={isSpeakerOn}
          isMinimized={isMinimized}
          cameraError={cameraError}
          isCameraLoading={isCameraLoading}
          isRemoteStreamReady = {remoteStreamReady}
          localStream = {localStream}
          localVideoTrackId = {localVideoTrackId}
          remoteVideoTrackId = {remoteVideoTrackId}
        />
      </div>
    </div>
  );
};

export default Chat;