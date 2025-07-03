// Mock socket service for frontend-only demo
import store from '../store/store';
import { 
  addMessage, 
  updateMessageStatus, 
  addOnlineUser, 
  removeOnlineUser, 
  setOnlineUsers,
  setTyping 
} from '../store/slices/chatSlice';
import { addNotification } from '../store/slices/uiSlice';
import toast from 'react-hot-toast';

class MockSocketService {
  constructor() {
    this.connected = false;
    this.listeners = new Map();
  }

  connect(token) {
    console.log('Mock socket connecting...');
    this.connected = true;
    
    // Simulate connection delay
    setTimeout(() => {
      console.log('Mock socket connected');
      this.emit('connect');
      
      // Mock some online users
      store.dispatch(setOnlineUsers(['2', '3', '4']));
    }, 1000);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Message methods
  sendMessage(chatId, message) {
    console.log('Mock sending message:', { chatId, message });
    
    // Simulate message delivery
    setTimeout(() => {
      this.emit('messageStatus', {
        messageId: message.id,
        status: 'delivered'
      });
    }, 1000);
    
    // Simulate read receipt
    setTimeout(() => {
      this.emit('messageStatus', {
        messageId: message.id,
        status: 'read'
      });
    }, 3000);
  }

  joinChat(chatId) {
    console.log('Mock joining chat:', chatId);
  }

  leaveChat(chatId) {
    console.log('Mock leaving chat:', chatId);
  }

  // Typing methods
  startTyping(chatId) {
    console.log('Mock start typing in chat:', chatId);
  }

  stopTyping(chatId) {
    console.log('Mock stop typing in chat:', chatId);
  }

  // Call methods
  initiateCall(userId, type = 'voice') {
    console.log('Mock initiating call:', { userId, type });
    toast.info(`Mock ${type} call initiated`);
  }

  acceptCall(callId) {
    console.log('Mock accepting call:', callId);
  }

  rejectCall(callId) {
    console.log('Mock rejecting call:', callId);
  }

  endCall(callId) {
    console.log('Mock ending call:', callId);
  }

  // WebRTC signaling (mock)
  sendOffer(callId, offer) {
    console.log('Mock sending WebRTC offer:', { callId, offer });
  }

  sendAnswer(callId, answer) {
    console.log('Mock sending WebRTC answer:', { callId, answer });
  }

  sendIceCandidate(callId, candidate) {
    console.log('Mock sending ICE candidate:', { callId, candidate });
  }

  disconnect() {
    console.log('Mock socket disconnecting...');
    this.connected = false;
    this.listeners.clear();
  }
}

export const socketService = new MockSocketService();
export default socketService;