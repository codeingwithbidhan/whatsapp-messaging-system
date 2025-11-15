import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, CheckCircle, UserPlus } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { createGroupChat, searchUsers, clearUserSearchResults } from '../../store/slices/chatSlice'; // আপনার সঠিক পথ ব্যবহার করুন

// ----------------------------------------------------------------------
// Debounce Function
// ----------------------------------------------------------------------
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

const NewGroupModal = ({ show, onClose }) => {
  const dispatch = useDispatch();
  
  // Local States
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]); // Array of user objects
  
  // Redux States
  const { 
    userSearchResults, 
    userSearchLoading, 
    groupCreationLoading,
    error: chatError // ত্রুটি হ্যান্ডলিং-এর জন্য
  } = useSelector(state => state.chat);
  
  // Current user's ID (Assuming the user ID is stored in auth.user.id)
  const currentUserId = useSelector(state => state.auth?.user?.id);

  // ---------------------------------
  // User Search Logic with Debounce
  // ---------------------------------
  
  // Debounced search dispatch function
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.trim().length > 1) {
        dispatch(searchUsers(query));
      }
    }, 500), // 500ms delay
    [dispatch]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);


  // ---------------------------------
  // Participant Selection Handlers
  // ---------------------------------
  
  const handleSelectParticipant = (user) => {
    if (selectedParticipants.some(p => p.id === user.id)) {
      // Already selected, remove it
      setSelectedParticipants(selectedParticipants.filter(p => p.id !== user.id));
    } else {
      // Add user
      setSelectedParticipants([...selectedParticipants, user]);
    }
  };
  
  const isSelected = (userId) => selectedParticipants.some(p => p.id === userId);

  const resetForm = () => {
    setGroupName('');
    setSearchQuery('');
    setSelectedParticipants([]);
    dispatch(clearUserSearchResults());
  };

  // ---------------------------------
  // Group Creation Handler
  // ---------------------------------
  
  const handleCreateGroup = async () => {
    const participantIds = selectedParticipants.map(user => user.id); 

    // কমপক্ষে দুইজন সদস্য (নিজে বাদে) বা তিনজন সদস্য (নিজেসহ) প্রয়োজন
    if (participantIds.length < 2) {
      alert("Please select at least 2 members for the group.");
      return;
    }
    
    if (!groupName.trim()) {
      alert("Please enter a name for the group.");
      return;
    }

    try {
      const response = await dispatch(createGroupChat({
        name: groupName.trim(),
        participantIds: participantIds,
        groupImage: null // TODO: Add file upload logic here
      })).unwrap();

      resetForm();
      onClose();

    } catch (error) {
      // Redux thunk এর rejectWithValue থেকে আসা error এখানে ধরা হবে
      console.error("Failed to create group:", error);
      alert(`Failed to create group: ${error.message || 'Unknown error'}`);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800">Create New Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
          
        {/* Body / Form */}
        <div className="py-6 space-y-4">
          
          {/* Group Name Input */}
          <div>
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name (Required)
            </label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Team Alpha"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Selected Participants Chips */}
          { selectedParticipants.length > 0 && (
          <div className="flex flex-wrap gap-2 min-h-[30px] border-b pb-3">
            <span className="text-sm font-medium text-blue-600 flex items-center">
              <UserPlus className="w-4 h-4 mr-1"/> Members ({selectedParticipants.length})
            </span>
            {selectedParticipants.map(user => (
              <span 
                key={user.id} 
                className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full cursor-pointer"
                onClick={() => handleSelectParticipant(user)}
              >
                {user.name} 
                <X className="w-3 h-3 ml-2 text-blue-600 hover:text-blue-900" />
              </span>
            ))}
          </div>
          )}
          
          {/* User Search Input */}
          <div>
            <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Add Members (Search)
            </label>
            <div className="relative">
              <input
                id="userSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          {/* Search Results */}
          <div className="h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
            {userSearchLoading && <p className="text-center text-blue-500">Searching...</p>}
            
            {!userSearchLoading && searchQuery.trim().length > 1 && userSearchResults.length === 0 && (
              <p className="text-center text-gray-500 mt-2">No users found.</p>
            )}

            {!userSearchLoading && userSearchResults.map(user => (
              // Hide current user from search results
              user.id !== currentUserId && (
                <div 
                  key={user.id} 
                  className={`flex items-center justify-between p-2 cursor-pointer rounded-lg transition ${isSelected(user.id) ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                  onClick={() => handleSelectParticipant(user)}
                >
                  <div className="flex items-center">
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full mr-3 object-cover"
                    />
                    <span className="font-medium text-gray-800">{user.name}</span>
                  </div>
                  {isSelected(user.id) ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <UserPlus className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              )
            ))}
          </div>

          {/* Error Message */}
          {chatError && <p className="text-red-500 text-sm mt-2">{chatError.message || chatError}</p>}
          
        </div>
          
        {/* Footer / Action Buttons */}
        <div className="flex justify-end space-x-3 border-t pt-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            disabled={groupCreationLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateGroup}
            disabled={groupCreationLoading || selectedParticipants.length < 2 || !groupName.trim()}
            className={`px-4 py-2 text-white rounded-lg transition ${
                groupCreationLoading || selectedParticipants.length < 2 || !groupName.trim()
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {groupCreationLoading ? 'Creating Group...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGroupModal;