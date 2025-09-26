// src/services/socket.js
import { io } from "socket.io-client";
import store from '../store/store';
import { setOnlineUsers, addMessage, updateMessageStatus, setTyping } from '../store/slices/chatSlice';
import { setIncomingCall, setInitiateCall, setIsConnected } from '../store/slices/callSlice.js'
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
            // bidhan:1
            store.dispatch(setIncomingCall({ fromUserId, callType }));
            // handle WebRTC signaling here
        });

        // Call answered
        this.socket.on('callAccepted', ({ toUserId }) => {
            store.dispatch(setIsConnected(true));
            console.log('Call answered by ', toUserId );
        });

        // Call answered
        this.socket.on('callRejected', ({ toUserId }) => {
            store.dispatch(setInitiateCall(false));
            console.log('Call rejected from', toUserId );
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
        // fromUserId = bidhan:1, toUserId = niloy:2
        store.dispatch(setInitiateCall(true));
        this.socket?.emit('callUser', { fromUserId, toUserId, callType });
    }

    acceptCall(fromUserId, toUserId) {
        console.log('fromUserId, toUserId', fromUserId, toUserId)
        // fromUserId = bidhan:1, toUserId: niloy:2
        this.socket?.emit("acceptCall", { fromUserId, toUserId });
    }
    // 🟢 কল reject
    rejectCall(fromUserId, toUserId) {
        // fromUserId = bidhan:1, toUserId: niloy:2
        this.socket?.emit("rejectCall", { fromUserId, toUserId });
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
