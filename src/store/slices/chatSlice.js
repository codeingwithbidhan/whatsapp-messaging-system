import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock messages for demo with reactions and replies
const mockMessages = {
  '1': [
    {
      id: '1',
      content: 'Hey! How are you doing?',
      type: 'text',
      sender: { id: '2', name: 'John Doe' },
      chatId: '1',
      status: 'read',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      reactions: [
        { emoji: '👍', count: 2, users: ['1', '3'] }
      ]
    },
    {
      id: '2',
      content: 'I\'m doing great! Thanks for asking 😊',
      type: 'text',
      sender: { id: '1', name: 'Demo User' },
      chatId: '1',
      status: 'read',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
      replyTo: {
        id: '1',
        content: 'Hey! How are you doing?',
        sender: { id: '2', name: 'John Doe' }
      }
    },
    {
      id: '3',
      content: 'Are we still on for the meeting tomorrow?',
      type: 'text',
      sender: { id: '2', name: 'John Doe' },
      chatId: '1',
      status: 'delivered',
      createdAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '4',
      content: 'Yes, absolutely! Looking forward to it 👍',
      type: 'text',
      sender: { id: '1', name: 'Demo User' },
      chatId: '1',
      status: 'sent',
      createdAt: new Date(Date.now() - 900000).toISOString(),
      replyTo: {
        id: '3',
        content: 'Are we still on for the meeting tomorrow?',
        sender: { id: '2', name: 'John Doe' }
      },
      reactions: [
        { emoji: '❤️', count: 1, users: ['2'] }
      ]
    }
  ],
  '2': [
    {
      id: '5',
      content: 'Thanks for the help yesterday!',
      type: 'text',
      sender: { id: '3', name: 'Sarah Wilson' },
      chatId: '2',
      status: 'read',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '6',
      content: 'You\'re welcome! Happy to help anytime 😊',
      type: 'text',
      sender: { id: '1', name: 'Demo User' },
      chatId: '2',
      status: 'read',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
      reactions: [
        { emoji: '😂', count: 1, users: ['3'] },
        { emoji: '👍', count: 1, users: ['3'] }
      ]
    }
  ],
  '3': [
    {
      id: '7',
      content: 'Meeting at 3 PM today',
      type: 'text',
      sender: { id: '4', name: 'Mike Johnson' },
      chatId: '3',
      status: 'delivered',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: '8',
      content: 'Got it! I\'ll be there',
      type: 'text',
      sender: { id: '5', name: 'Lisa Chen' },
      chatId: '3',
      status: 'read',
      createdAt: new Date(Date.now() - 7000000).toISOString(),
      replyTo: {
        id: '7',
        content: 'Meeting at 3 PM today',
        sender: { id: '4', name: 'Mike Johnson' }
      }
    }
  ]
};

// Async thunks
export const fetchChats = createAsyncThunk(
  'chat/fetchChats',
  async (_, { rejectWithValue }) => {
    try {
      // Use mock data from localStorage
      const mockChats = JSON.parse(localStorage.getItem('mockChats') || '[]');
      return mockChats;
    } catch (error) {
      return rejectWithValue('Failed to fetch chats');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ chatId, page = 1 }, { rejectWithValue }) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const messages = mockMessages[chatId] || [];
      return { chatId, messages, hasMore: false };
    } catch (error) {
      return rejectWithValue('Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (messageData, { rejectWithValue, getState }) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { auth } = getState();
      const newMessage = {
        id: Date.now().toString(),
        content: messageData.content,
        type: messageData.type || 'text',
        sender: auth.user,
        chatId: messageData.chatId,
        status: 'sent',
        createdAt: new Date().toISOString(),
        replyTo: messageData.replyTo || null,
        reactions: [],
        // Include file-related fields if present
        ...(messageData.fileUrl && {
          fileUrl: messageData.fileUrl,
          fileName: messageData.fileName,
          fileSize: messageData.fileSize,
          fileType: messageData.fileType, // Preserve the original file type
        })
      };
      
      return newMessage;
    } catch (error) {
      return rejectWithValue('Failed to send message');
    }
  }
);

export const addReaction = createAsyncThunk(
  'chat/addReaction',
  async ({ messageId, reaction, userId }, { rejectWithValue }) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { messageId, reaction, userId };
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
      const { chatId, message } = action.payload;
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      state.messages[chatId].push(message);
      
      // Update last message in chat
      const chat = state.chats.find(c => c.id === chatId);
      if (chat) {
        chat.lastMessage = message;
        chat.updatedAt = message.createdAt;
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
      const { messageId, reaction, userId } = action.payload;
      Object.values(state.messages).forEach(chatMessages => {
        const message = chatMessages.find(m => m.id === messageId);
        if (message) {
          if (!message.reactions) {
            message.reactions = [];
          }
          
          const existingReaction = message.reactions.find(r => r.emoji === reaction.emoji);
          if (existingReaction) {
            if (!existingReaction.users.includes(userId)) {
              existingReaction.users.push(userId);
              existingReaction.count++;
            }
          } else {
            message.reactions.push({
              emoji: reaction.emoji,
              count: 1,
              users: [userId]
            });
          }
        }
      });
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
      const { chatId, userId, isTyping } = action.payload;
      const chat = state.chats.find(c => c.id === chatId);
      if (chat) {
        if (!chat.typing) chat.typing = [];
        if (isTyping && !chat.typing.includes(userId)) {
          chat.typing.push(userId);
        } else if (!isTyping) {
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
        const message = action.payload;
        const chatId = message.chatId;
        if (!state.messages[chatId]) {
          state.messages[chatId] = [];
        }
        state.messages[chatId].push(message);
        
        // Update last message in chat
        const chat = state.chats.find(c => c.id === chatId);
        if (chat) {
          chat.lastMessage = message;
          chat.updatedAt = message.createdAt;
        }
      })
      // Add Reaction
      .addCase(addReaction.fulfilled, (state, action) => {
        const { messageId, reaction, userId } = action.payload;
        Object.values(state.messages).forEach(chatMessages => {
          const message = chatMessages.find(m => m.id === messageId);
          if (message) {
            if (!message.reactions) {
              message.reactions = [];
            }
            
            const existingReaction = message.reactions.find(r => r.emoji === reaction.emoji);
            if (existingReaction) {
              if (!existingReaction.users.includes(userId)) {
                existingReaction.users.push(userId);
                existingReaction.count++;
              }
            } else {
              message.reactions.push({
                emoji: reaction.emoji,
                count: 1,
                users: [userId]
              });
            }
          }
        });
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