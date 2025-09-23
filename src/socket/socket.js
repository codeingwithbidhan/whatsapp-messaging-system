// src/services/socket.js
import { io } from "socket.io-client";
import store from '../store/store';
import { setOnlineUsers, addMessage, updateMessageStatus, setTyping } from '../store/slices/chatSlice';
import { toast } from 'react-hot-toast';

// Node.js server এর URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketService {
    constructor() {
        this.socket = null;
    }
    connect(userId) {
        // Connect to backend Socket.IO server
        this.socket = io(SOCKET_URL, {
            auth: { userId },
            withCredentials: true,
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            // Add user to online list
            this.socket.emit('addUser', userId);
        });

        // Listen online users
        this.socket.on('onlineUsers', (users) => {
            store.dispatch(setOnlineUsers(users));
        });

        // Listen new message
        this.socket.on('private_message', (msg) => {
            console.log('front => private_message', msg)
            store.dispatch(addMessage(msg));
        });

        // Listen message status updates
        this.socket.on('messageStatus', ({ messageId, status }) => {
            store.dispatch(updateMessageStatus({ messageId, status }));
        });

        // Typing
        this.socket.on('typing', ({ chatId, userId, typing }) => {
            store.dispatch(setTyping({ chatId, userId, typing }));
        });

        // Incoming call
        this.socket.on('incomingCall', ({ fromUserId, callType }) => {
            toast.info(`Incoming ${callType} call from ${fromUserId}`);
            // handle WebRTC signaling here
        });

        // Call answered
        this.socket.on('callAnswered', ({ signalData }) => {
            console.log('Call answered', signalData);
        });

        // Call ended
        this.socket.on('callEnded', () => {
            toast.info('Call ended');
        });

    }
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinChat(chatId) {
        this.socket?.emit('joinChat', chatId);
    }

    leaveChat(chatId) {
        this.socket?.emit('leaveChat', chatId);
    }

    sendMessage(chatId, message) {
        this.socket?.emit('sendMessage', { chatId, message });
    }

    startTyping(chatId, userId) {
        console.log('socket chatId', chatId)
        this.socket?.emit('startTyping', chatId, userId);
    }

    stopTyping(chatId, userId) {
        this.socket?.emit('stopTyping', chatId, userId);
    }

    initiateCall(fromUserId, toUserId, callType) {
        this.socket?.emit('callUser', { fromUserId, toUserId, callType });
    }

    answerCall(toUserId, signalData) {
        this.socket?.emit('answerCall', { toUserId, signalData });
    }

    endCall(toUserId) {
        this.socket?.emit('endCall', { toUserId });
    }
}
export const socketService = new SocketService();
export default socketService;
//
// // Singleton socket instance
// let socket;
//
// export const initSocket = (userId) => {
//     if (!socket) {
//         socket = io(SOCKET_URL, {
//             auth: { userId }, // token দাও যদি JWT দিতে চাও
//             transports: ["websocket"],
//         });
//
//         // Debug log
//         socket.on("connect", () => {
//             socket.emit("register", userId);
//         });
//
//         socket.on("disconnect", () => {
//             console.log("❌ Disconnected from socket server");
//         });
//     }
//     return socket;
// };
//
// export const getSocket = () => socket;
//
// export const disconnectSocket = () => {
//     if (socket) {
//         socket.disconnect();
//         socket = null;
//     }
// };
