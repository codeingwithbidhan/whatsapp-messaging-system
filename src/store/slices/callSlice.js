import {createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const callSlice = createSlice({
    name: 'call',
    initialState: {
        isInitiateCall: false,
        incomingCall: null, // { fromUserId, callType }
        callType: null,
        isConnected: false,
        remoteUser: null,
    },
    reducers: {
        setIncomingCall: (state, action) => {
            // action.payload.fromUserId = 1
            // action.payload.callType = 1
            state.incomingCall = action.payload
        },
        setInitiateCall: (state, action) => {
            state.isInitiateCall = action.payload
        },
        setIsConnected: (state, action) => {
            state.isConnected = action.payload
        },
        acceptCall: (state, action) => {
            state.isConnected = true;
            state.callType = state.incomingCall?.callType || action.payload.callType;
            state.remoteUser = action.payload.fromUserId; // bidhan: 1
            state.incomingCall = null;
        },
        rejectCall: (state) => {
            state.incomingCall = null;
            state.isConnected = false;
            state.callType = null;
            state.remoteUser = null;
        },
    },
    extraReducers: {

    }
})
export const { setIncomingCall,setInitiateCall, setIsConnected, acceptCall, rejectCall } = callSlice.actions;
export default callSlice.reducer