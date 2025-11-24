// Singleton class to safely hold non-serializable Agora RTM/RTC objects 
// outside of the Redux store.

/**
 * @typedef  {Object} AgoraObjects
 * @property {import('agora-rtc-sdk-ng').ILocalTrack | null} localVideoTrack
 * @property {import('agora-rtc-sdk-ng').ILocalTrack | null} localAudioTrack
 * @property {import('agora-rtc-sdk-ng').IRemoteTrack | null} remoteVideoTrack
 * @property {import('agora-rtc-sdk-ng').IRemoteTrack | null} remoteAudioTrack
 * @property {import('agora-rtc-sdk-ng').IAgoraRTCClient | null} rtcClient
 * */

class AgoraStore {
    /** @type {AgoraObjects} */
    #objects = {
        localVideoTrack: null,
        localAudioTrack: null,
        remoteVideoTrack: null,
        remoteAudioTrack: null,
        rtcClient: null,
    };

    static #instance = null;

    constructor() {
        if (AgoraStore.#instance) {
            return AgoraStore.#instance;
        }
        AgoraStore.#instance = this;
    }

    /**
     * Get the singleton instance of the store.
     * @returns {AgoraStore}
     */
    static getInstance() {
        if (!AgoraStore.#instance) {
            AgoraStore.#instance = new AgoraStore();
        }
        return AgoraStore.#instance;
    }

    /**
     * Safely store an Agora object.
     * @param {'localVideoTrack'|'localAudioTrack'|'remoteVideoTrack'|'remoteAudioTrack'|'rtcClient'} key 
     * @param {any} object The Agora Track or Client object.
     */
    set(key, object) {
        if (!this.#objects.hasOwnProperty(key)) {
            console.error(`Invalid key used for AgoraStore: ${key}`);
            return;
        }
        this.#objects[key] = object;
    }

    /**
     * Retrieve a stored Agora object.
     * @param {'localVideoTrack'|'localAudioTrack'|'remoteVideoTrack'|'remoteAudioTrack'|'rtcClient'} key 
     * @returns {any} The stored object or null.
     */
    get(key) {
        return this.#objects[key];
    }
    
    /**
     * Clear all stored tracks and client.
     */
    clearAll() {
        this.#objects = {
            localVideoTrack: null,
            localAudioTrack: null,
            remoteVideoTrack: null,
            remoteAudioTrack: null,
            rtcClient: null,
        };
        console.log("AgoraStore: All tracks and client references cleared.");
    }
}

export const agoraStore = AgoraStore.getInstance();