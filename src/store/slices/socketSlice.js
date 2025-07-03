import { createSlice } from '@reduxjs/toolkit';

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    connection: null,
    connected: false,
    error: null,
  },
  reducers: {
    setSocket: (state, action) => {
      state.connection = action.payload;
      state.connected = true;
      state.error = null;
    },
    clearSocket: (state) => {
      if (state.connection) {
        state.connection.disconnect();
      }
      state.connection = null;
      state.connected = false;
      state.error = null;
    },
    setSocketError: (state, action) => {
      state.error = action.payload;
      state.connected = false;
    },
  },
});

export const { setSocket, clearSocket, setSocketError } = socketSlice.actions;
export default socketSlice.reducer;