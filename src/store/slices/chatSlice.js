import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as chatAPI from '../../api/chat.js';
import {getMessages, sendMessages } from "../../api/chat.js";

// Async thunks
export const fetchChats = createAsyncThunk(
    'chat/fetchChats',
    async (_, { rejectWithValue }) => {
      try {
        // Use mock data from localStorage
        const response = await chatAPI.getChats();
        return response.data;
      } catch (error) {
        return rejectWithValue('Failed to fetch chats');
      }
    }
);

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async ({ chatId, page = 1 }, { rejectWithValue }) => {
      try {
        const response = await chatAPI.getMessages(chatId);
        const messages = response.data.data || [];
        return { chatId, messages, hasMore: false };
      } catch (error) {
        return rejectWithValue('Failed to fetch messages');
      }
    }
);

export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    async (messageData, { rejectWithValue, getState, dispatch }) => {
      const tempId = Date.now().toString();
      try {
        const { auth } = getState();
        // Temporary message for optimistic UI
        const tempMessage = {
          id: tempId,
          chatId: messageData.chatId,
          message: messageData.message,
          type: messageData.type,
          sender: auth.user,
          status: "sending",
          created_at: new Date().toISOString(),
          fileUrl: messageData.file_path || null,
          thumbnailUrl: messageData.file_path || null,
          reactions: [],
          reply_to: messageData.reply_to || null,
          replyTo: messageData.replyTo || null,
        };

        // Add temp message to redux store immediately
        dispatch(addMessage(tempMessage));

        // API call to backend
        const response = await chatAPI.sendMessages(messageData);
        return { tempId, message: response.data };

      } catch (error) {
        return rejectWithValue({
          error: error.response?.data || "Failed to send message",
          chatId: messageData.chatId,
          tempId
        });
      }
    }
);

export const addReaction = createAsyncThunk(
    'chat/addReaction',
    async (messageReactionData, { rejectWithValue, getState, dispatch }) => {
      const tempId = Date.now().toString();
      const chatId = messageReactionData.chatId;
      try {
        const { auth } = getState();
        const tempReaction = {
          id: tempId,
          chatId: chatId,
          messageId: messageReactionData.message_id,
          emoji: messageReactionData.reaction,
          user: auth.user.name,
          avatar: auth.user.avatar,
        };
        dispatch(addMessageReaction(tempReaction))
        const response = await chatAPI.addReaction(messageReactionData);
        return { chatId, tempId, message: response.data };
      } catch (error) {
        return rejectWithValue('Failed to add reaction');
      }
    }
);

export const createChat = createAsyncThunk(
    'chat/createChat',
    async ({ userId, type = 'direct' }, { rejectWithValue }) => {
      try {
        // Mock chat creation
        const newChat = {
          id: Date.now().toString(),
          name: 'New Chat',
          type,
          participants: [],
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date().toISOString()
        };
        return newChat;
      } catch (error) {
        return rejectWithValue('Failed to create chat');
      }
    }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    activeChat: null,
    messages: {},
    users: [],
    onlineUsers: ['2', '3', '4'], // Mock some online users
    loading: false,
    error: null,
    hasMore: {},
  },
  reducers: {
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
    },
    addMessage: (state, action) => {
      const { chatId } = action.payload;
      const message = action.payload

      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      state.messages[chatId].push(message);

      // Update lastMessage
      const chat = state.chats.find(c => c.chatId === chatId);
      if (chat) {
        chat.lastMessage = {
          message: message.message,
          created_at: message.created_at,
        };
      }
    },
    updateMessageStatus: (state, action) => {
      const { messageId, status } = action.payload;
      Object.values(state.messages).forEach(chatMessages => {
        const message = chatMessages.find(m => m.id === messageId);
        if (message) {
          message.status = status;
        }
      });
    },
    addMessageReaction: (state, action) => {
      const { chatId, messageId } = action.payload;
      const reaction = action.payload;
      const chatMessages = state.messages[chatId] || [];
      const msgIndex = chatMessages.findIndex(msg => msg.id === messageId);
      if (msgIndex !== -1) {
        chatMessages[msgIndex] = {
          ...chatMessages[msgIndex],
          reactions: [...(chatMessages[msgIndex].reactions || []), reaction]
        };
      }
    },
    removeMessageReaction: (state, action) => {
      const { messageId, reactionEmoji, userId } = action.payload;
      Object.values(state.messages).forEach(chatMessages => {
        const message = chatMessages.find(m => m.id === messageId);
        if (message && message.reactions) {
          const reactionIndex = message.reactions.findIndex(r => r.emoji === reactionEmoji);
          if (reactionIndex !== -1) {
            const reaction = message.reactions[reactionIndex];
            reaction.users = reaction.users.filter(id => id !== userId);
            reaction.count = reaction.users.length;

            if (reaction.count === 0) {
              message.reactions.splice(reactionIndex, 1);
            }
          }
        }
      });
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    addOnlineUser: (state, action) => {
      const userId = action.payload;
      if (!state.onlineUsers.includes(userId)) {
        state.onlineUsers.push(userId);
      }
    },
    removeOnlineUser: (state, action) => {
      const userId = action.payload;
      state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
    },
    clearChatError: (state) => {
      state.error = null;
    },
    setTyping: (state, action) => {
      const { chatId, userId, typing } = action.payload;
      const chat = state.chats.find(c => c.chatId === chatId);
      if (chat) {
        if (!chat.typing) chat.typing = [];
        if (typing && !chat.typing.includes(userId)) {
          chat.typing.push(userId);
        } else if (!typing) {
          chat.typing = chat.typing.filter(id => id !== userId);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
        // Fetch Chats
        .addCase(fetchChats.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchChats.fulfilled, (state, action) => {
          state.loading = false;
          state.chats = action.payload;
          state.error = null;
        })
        .addCase(fetchChats.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        })
        // Fetch Messages
        .addCase(fetchMessages.pending, (state) => {
          state.loading = true;
        })
        .addCase(fetchMessages.fulfilled, (state, action) => {
          state.loading = false;
          const { chatId, messages, hasMore } = action.payload;
          state.messages[chatId] = messages;
          state.hasMore[chatId] = hasMore;
        })
        .addCase(fetchMessages.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        })
        // Send Message
        .addCase(sendMessage.fulfilled, (state, action) => {
          const { tempId, message } = action.payload;
          const chatId = message.chatId;

          const allMessagesByChatId = state.messages[chatId] || [];
          // find message by tempId
          const msgIndex = allMessagesByChatId.findIndex(m => m.id === tempId);
          if (msgIndex !== -1) {
            allMessagesByChatId[msgIndex] = { ...message };
          } else {
            allMessagesByChatId.push({ ...message });
          }

          // update lastMessage directly
          const chat = state.chats.find(c => c.chatId === chatId);
          if (chat) {
            chat.lastMessage = {
              message: message.message,
              created_at: message.created_at,
            };
          }
        })
        .addCase(sendMessage.rejected, (state, action) => {
          const { chatId, tempId } = action.payload || action.meta.arg;
          const allMessagesByChatId = state.messages[chatId] || [];
          const msg = allMessagesByChatId.find((m) => m.id === tempId);
          if (msg) {
            msg.status = "failed";
          }
          console.error('Message send failed:', action.payload);
        })
        // Add Reaction
        .addCase(addReaction.fulfilled, (state, action) => {
          const { chatId, tempId, message } = action.payload;
          const reaction = action.payload;
          const chatMessages = state.messages[chatId] || [];
          const msgIndex = chatMessages.findIndex(msg => msg.id === message.message_id);
          if (msgIndex !== -1) {
            chatMessages[msgIndex].reactions[tempId] = message;
          }
        })
        // Create Chat
        .addCase(createChat.fulfilled, (state, action) => {
          const newChat = action.payload;
          state.chats.unshift(newChat);
          state.activeChat = newChat.id;
        });
  },
});

export const {
  setActiveChat,
  addMessage,
  updateMessageStatus,
  addMessageReaction,
  removeMessageReaction,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  clearChatError,
  setTyping,
} = chatSlice.actions;

export default chatSlice.reducer;