import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';
import socketSlice from './slices/socketSlice';
import uiSlice from './slices/uiSlice';
import callSlice from "./slices/callSlice.js";
import agoraCallSlice from "./slices/agoraCallSlice.js";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    call: callSlice,
    agoraCall: agoraCallSlice,
    socket: socketSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['socket/setSocket', 'call/setLocalTracks', 'call/setRemoteTracks'],
        ignoredPaths: ['socket.connection'],
      },
    }),
});

export default store;