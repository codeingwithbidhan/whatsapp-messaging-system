import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as chatAPI from '../../api/chat.js';

// -----------------------------------------------------------
// NEW ASYNC THUNK: Search Users (আপনার কোড থেকে নেওয়া)
// -----------------------------------------------------------
export const createGroupChat = createAsyncThunk(
  'chat/createGroupChat',
  async ({ name, participantIds, groupImage }, { rejectWithValue }) => {
    try {
      const payload = {
        group_name: name,
        group_avatar: groupImage || null, 
        all_members: participantIds, 
      };
      const response = await chatAPI.createGroupChatAPI(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to create group chat');
    }
  }
);

// -----------------------------------------------------------
// NEW ASYNC THUNK: Search Users
// -----------------------------------------------------------
export const searchUsers = createAsyncThunk(
  'chat/searchUsers',
  async (query, { rejectWithValue }) => {
    try {
      if (!query.trim()) return [];
      
      // Call the new API function
      const response = await chatAPI.searchUsers(query);
      return response.data; // Assuming response.data is an array of users
    } catch (error) {
      return rejectWithValue('Failed to search users');
    }
  }
);

// -----------------------------------------------------------
// UPDATED ASYNC THUNK: Create Chat (using API)
// -----------------------------------------------------------
export const createChat = createAsyncThunk(
  'chat/createChat',
  async ({ partnerId, type = 'direct' }, { rejectWithValue }) => {
    try {
      // Call the new API function
      const response = await chatAPI.createChatAPI(partnerId); 
      return response.data; // Assuming response.data is the newly created chat object
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to create chat');
    }
  }
);

export const uploadFile = createAsyncThunk(
  'chat/uploadFile',
  async ({ formData, tempId, chatId }, { rejectWithValue, dispatch }) => {
    try {
      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          dispatch(updateMessageProgress({ 
            tempId, 
            chatId, 
            progress: percentCompleted 
          }));
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      const response = await chatAPI.uploadFile(formData, config);
      return response.data;

    } catch (error) {
      return rejectWithValue({ 
        error: error.response?.data || "File upload failed",
        chatId,
        tempId
      });
    }
  }
);

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
    // const tempId = Date.now().toString();
    const tempId = messageData.id;
    try {
      const { auth } = getState();
      const currentUserId = auth.user.id;
      // Temporary message for optimistic UI
      const tempMessage = {
        id: tempId,
        chatId: messageData.chatId,
        message: messageData.message || '',
        type: messageData.type,
        sender: auth.user,
        status: "sending",
        created_at: new Date().toISOString(),
        file_path: messageData.file_path || null,
        thumbnailUrl: messageData.thumbnailUrl || messageData.file_path || null,
        file_name: messageData.file_name || null,
        fileSize: messageData.fileSize || null,
        fileOriginalType: messageData.fileOriginalType || null,
        reactions: [],
        reply_to: messageData.reply_to || null,
        replyTo: messageData.replyTo || null,
      };
      

      // Add temp message to redux store immediately
      // dispatch(addMessage(tempMessage));
      if (!messageData.file_path) {
        dispatch(addMessage({ ...tempMessage, currentUserId: currentUserId }));
      }
      
      // API call to backend
      const response = await chatAPI.sendMessages(messageData);

      // API successful: ID আপডেট করুন
      dispatch(updateMessageId({ tempId, chatId: messageData.chatId, newMessage: response.data }));
      return { tempId, message: response.data };

    } catch (error) {
      return rejectWithValue({
        error: error.response?.data || "Failed to send message",
        chatId: messageData.chatId,
        tempId,
        fileUrl: messageData.file_path,
      });
    }
  }
);

export const receiveNewMessage = createAsyncThunk(
  'chat/receiveNewMessage',
  async (payload, { dispatch, getState }) => {
    const currentUserId = getState().auth.user.id;
    dispatch(addMessage({...payload, currentUserId: currentUserId }));
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

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    activeChat: null,
    messages: {},
    users: [],
    onlineUsers: ['2', '3', '4'],
    loading: false,
    error: null,
    hasMore: {},
    userSearchLoading: false, 
    userSearchResults: [],
    groupCreationLoading: false,
  },
  reducers: {
    clearUserSearchResults: (state) => {
      state.userSearchResults = [];
    },
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
    },
    updateMessageProgress: (state, action) => {
      const { tempId, chatId, progress } = action.payload;
      // নির্দিষ্ট চ্যাট আইডি-এর মেসেজ অ্যারে খুঁজে বের করা
      const messages = state.messages[chatId];
      if (messages) {
        // টেম্প মেসেজটি খুঁজে বের করা
        const messageIndex = messages.findIndex(msg => msg.id === tempId);
        if (messageIndex !== -1) {
          state.messages[chatId][messageIndex].progress = progress;
          if (progress < 100) {
            state.messages[chatId][messageIndex].status = 'uploading';
          } else if (progress === 100) {
            state.messages[chatId][messageIndex].status = 'sending';
          }
        }
      }
    },
    addMessageReducer: (state, action) => {
      // currentUserId কে পেলোড থেকে নিন (যা Thunk পাস করবে)
      const { chatId, sender, currentUserId, ...message } = action.payload;
      
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      state.messages[chatId].push(message);

      const chat = state.chats.find(c => c.chatId === chatId);
      if (chat) {
        chat.updated_at = message.created_at;

        // 🎯 লজিক ঠিক করা হলো: যদি প্রেরক আপনি না হন, তবেই unreadCount বাড়ান
        if (sender.id !== currentUserId) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
        
        chat.lastMessage = {
          id: message.id,
          message: message.message,
          created_at: message.created_at,
          status: message.status,
        };

        // চ্যাট লিস্ট সর্টিং
        state.chats.sort((a, b) => {
          const dateA = new Date(a.updated_at).getTime();
          const dateB = new Date(b.updated_at).getTime();
          return dateB - dateA;
        });
      }
    },
    updateMessageId: (state, action) => {
      const { chatId, tempId, newMessage } = action.payload;
      
      const messageArray = state.messages[chatId];
      if (messageArray) {
        const tempIndex = messageArray.findIndex(m => String(m.id) === tempId);
          
        if (tempIndex !== -1) {
          // 1. নতুন মেসেজ দিয়ে temp মেসেজটি প্রতিস্থাপন করুন
          messageArray[tempIndex] = newMessage;
          console.log('newMessage', newMessage);
          

          // 2. চ্যাট লিস্টে lastMessage আপডেট করুন
          const chat = state.chats.find(c => c.chatId === chatId);
          if (chat && String(chat.lastMessage?.id) === tempId) {
            chat.lastMessage = {
              id: newMessage.id,
              message: newMessage.message ?? newMessage.file_name,
              created_at: newMessage.created_at,
              status: newMessage.status,
            };
          }      
        }
      }
    },
    // 1. নতুন অ্যাকশন: মেসেজের স্ট্যাটাস আপডেট করার জন্য
    updateMessageStatus: (state, action) => {
      const { messageId, status } = action.payload;

      for (const chatId in state.messages) {
        if (state.messages.hasOwnProperty(chatId)) { // ভালো অভ্যাস
          const messageArray = state.messages[chatId];
          
          const messageIndex = messageArray.findIndex(
            (msg) => String(msg.id) === String(messageId) // ⬅️ নিরাপদ তুলনা
          );

          if (messageIndex !== -1) {
            messageArray[messageIndex].status = status;
            const chat = state.chats.find(c => String(c.chatId) === String(chatId)); // chat ID তুলনাও নিরাপদ
            if (chat && String(chat.lastMessage?.id) === String(messageId)) { // ⬅️ নিরাপদ তুলনা
              chat.lastMessage.status = status;
            }
            console.log('last message =>', chat);
            return; 
          }
        }
      }
    },
    // 3. নতুন অ্যাকশন: Unread count রিসেট করার জন্য (যখন চ্যাট খোলা হয়)
    resetUnreadCount: (state, action) => {
      const { chatId } = action.payload;
      const chat = state.chats.find(c => c.chatId === chatId);
      if (chat) {
        chat.unreadCount = 0;
      }
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
        const { message } = action.payload;
        const chatId = message.chatId;

        // const allMessagesByChatId = state.messages[chatId] || [];
        // // find message by tempId
        // const msgIndex = allMessagesByChatId.findIndex(m => m.id === tempId);
        // if (msgIndex !== -1) {
        //   allMessagesByChatId[msgIndex] = { ...message };
        // } else {
        //   allMessagesByChatId.push({ ...message });
        // }

        // 1. চ্যাট মেসেজ অ্যারে আপডেট:
        // if (state.messages[chatId]) {
        //   // tempId দিয়ে লোকাল মেসেজটি খুঁজে বের করুন
        //   const tempIndex = state.messages[chatId].findIndex(m => m.id === tempId);

        //   if (tempIndex !== -1) {
        //     state.messages[chatId][tempIndex] = {
        //       ...message,
        //       status: 'sent',
        //       id: message.id,
        //     };
        //   }
        // }

        // update lastMessage directly
        const chat = state.chats.find(c => c.chatId === chatId);
        if (chat) {
          // chat.updated_at = message.created_at;
          // chat.lastMessage = {
          //   id: message.id,
          //   message: message.message,
          //   created_at: message.created_at,
          //   status: 'sent',
          // };

          // 2. সর্টিং (অত্যন্ত জরুরি!)
          state.chats.sort((a, b) => {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA;
          });
        }

      })
      .addCase(sendMessage.rejected, (state, action) => {
        const { chatId, tempId } = action.payload || action.meta.arg;
        if (state.messages[chatId]) {
          const tempMessage = state.messages[chatId].find(m => m.id === tempId);
          if (tempMessage) {
            tempMessage.status = 'failed';
            // অপশনাল: মেসেজটি রিমুভও করে দিতে পারেন
          }
        }
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

      .addCase(searchUsers.pending, (state) => {
        state.userSearchLoading = true;
        state.userSearchResults = [];
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.userSearchLoading = false;
        state.userSearchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.userSearchLoading = false;
        state.error = action.payload;
        state.userSearchResults = [];
      })

      // Create Chat
      .addCase(createChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChat.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = action.payload;
        state.error = null;
      })
      .addCase(createChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // NEW CASES: Create Group Chat
      .addCase(createGroupChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroupChat.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = action.payload;
        state.error = null;
      })
      .addCase(createGroupChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setActiveChat,
  updateMessageProgress,
  addMessageReducer: addMessage,
  updateMessageId,
  updateMessageStatus,
  resetUnreadCount,
  addMessageReaction,
  removeMessageReaction,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  clearChatError,
  setTyping,
  clearUserSearchResults
} = chatSlice.actions;

export default chatSlice.reducer;