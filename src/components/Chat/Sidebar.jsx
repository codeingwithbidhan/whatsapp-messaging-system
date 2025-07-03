import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, 
  MessageCircle, 
  Settings, 
  LogOut, 
  Users,
  Phone,
  Video,
  MoreVertical 
} from 'lucide-react';
import { setActiveChat, fetchChats, createChat } from '../../store/slices/chatSlice';
import { logoutUser } from '../../store/slices/authSlice';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { chats, activeChat, onlineUsers } = useSelector((state) => state.chat);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const filteredChats = chats.filter(chat =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.participants?.some(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleChatSelect = (chatId) => {
    dispatch(setActiveChat(chatId));
    
    // On mobile, hide sidebar when chat is selected
    if (window.innerWidth < 768) {
      dispatch(setSidebarOpen(false));
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getLastMessageText = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    
    const { content, type, sender } = chat.lastMessage;
    const isOwnMessage = sender?.id === user?.id;
    const prefix = isOwnMessage ? 'You: ' : '';
    
    switch (type) {
      case 'image':
        return `${prefix}📷 Photo`;
      case 'file':
        return `${prefix}📎 File`;
      case 'voice':
        return `${prefix}🎤 Voice message`;
      case 'video':
        return `${prefix}🎥 Video`;
      default:
        return `${prefix}${content}`;
    }
  };

  const isUserOnline = (userId) => onlineUsers.includes(userId);

  const getChatParticipant = (chat) => {
    if (chat.type === 'group') return null;
    return chat.participants?.find(p => p.id !== user?.id);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=10b981&color=fff`}
                alt={user?.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 className="font-semibold text-white">{user?.name}</h3>
              <p className="text-xs text-green-100">Online</p>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border py-2 w-48 z-10">
                <button className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-gray-700">
                  <Settings className="w-4 h-4 mr-3" />
                  Settings
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Mobile Header Title */}
      <div className="lg:hidden bg-gray-50 px-4 py-3 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
      </div>

      {/* Action Buttons - Hidden on mobile for cleaner look */}
      <div className="hidden lg:block p-4 border-b bg-gray-50">
        <div className="flex space-x-2">
          <button className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <MessageCircle className="w-4 h-4 inline mr-2" />
            New Chat
          </button>
          <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4 inline mr-2" />
            New Group
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No chats found</h3>
            <p className="text-sm">Start a new conversation to get started</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const participant = getChatParticipant(chat);
            const isOnline = participant ? isUserOnline(participant.id) : false;
            
            return (
              <div
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={`p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors active:bg-gray-100 ${
                  activeChat === chat.id ? 'bg-green-50 border-green-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    {chat.type === 'group' ? (
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                    ) : (
                      <img
                        src={participant?.avatar || `https://ui-avatars.com/api/?name=${participant?.name}&background=6366f1&color=fff`}
                        alt={chat.name || participant?.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    )}
                    
                    {chat.type !== 'group' && isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-800 truncate text-lg">
                        {chat.name || participant?.name || 'Unknown'}
                      </h4>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {getLastMessageText(chat)}
                      </p>
                      
                      {chat.unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center font-medium">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    {chat.typing && chat.typing.length > 0 && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        {chat.typing.length === 1 ? 'typing...' : `${chat.typing.length} people typing...`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Action Buttons at Bottom */}
      <div className="lg:hidden p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <button className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors">
            <MessageCircle className="w-4 h-4 inline mr-2" />
            New Chat
          </button>
          <button className="flex-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4 inline mr-2" />
            Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;