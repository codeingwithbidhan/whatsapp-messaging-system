import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, MessageCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { createChat, searchUsers, setActiveChat } from '../../store/slices/chatSlice'; // Import thunks
import toast from 'react-hot-toast';

const NewChatModal = ({ show, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useDispatch();
  
  // Use Redux state for search results and loading
  const { userSearchResults: searchResults, userSearchLoading: loading, chats } = useSelector((state) => state.chat);
  const currentUserId = useSelector(state => state.auth.user?.id); // Assuming user ID is here

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Only dispatch if there is a search term
      if (searchTerm.trim()) {
        dispatch(searchUsers(searchTerm));
      } else {
        // Clear results if search term is empty
        dispatch({ type: 'chat/searchUsers/fulfilled', payload: [] });
      }
    }, 400); // Debounce search for 400ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, dispatch]);

  if (!show) return null;
  
  const handleCreateChat = async (partner) => {
    // 1. Check if chat already exists in local state
    const existingChat = chats.find(chat => 
      chat.type === 'direct' && chat.participants.some(p => p.id === partner.id)
    );

    if (existingChat) {
        dispatch(setActiveChat(existingChat.chatId));
        toast.success(`Switching to chat with ${partner.name}`);
        onClose();
        return;
    }

    // 2. Create the chat via API/Thunk
    try {
      // Assuming createChat takes the partner's ID for a private chat
      const resultAction = await dispatch(createChat({ partnerId: partner.id })).unwrap();      
      toast.success(`Chat created with ${partner.name}!`);
      
      // setActiveChat is handled in the thunk's fulfilled action, 
      // but we ensure the sidebar logic gets the new chat ID
      dispatch(setActiveChat(resultAction.chatId || resultAction.id)); 
      onClose(); 
    } catch (error) {
      const errorMessage = error.message || 'Failed to create chat. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">Start a New Chat</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && searchTerm.trim() && (
            <div className="p-4 text-center text-green-600">Searching...</div>
          )}
          {!loading && searchTerm.trim() !== '' && searchResults.length === 0 && (
            <div className="p-4 text-center text-gray-500">No users found matching "{searchTerm}".</div>
          )}
          
          {searchResults
            .filter(user => user.id !== currentUserId) // Filter out the current user
            .map((user) => (
            <div
              key={user.id}
              onClick={() => handleCreateChat(user)}
              className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=10b981&color=fff`}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{user.name}</p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
              <MessageCircle className="w-5 h-5 text-green-500 ml-4 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;