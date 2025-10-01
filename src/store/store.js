import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';
import socketSlice from './slices/socketSlice';
import uiSlice from './slices/uiSlice';
import callSlice from "./slices/callSlice.js";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    call: callSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['socket/setSocket'],
        ignoredPaths: ['socket.connection'],
      },
    }),
});

export default store;