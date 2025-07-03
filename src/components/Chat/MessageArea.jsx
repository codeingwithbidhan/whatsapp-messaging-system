import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical,
  Send,
  Paperclip,
  Mic,
  Smile,
  Image,
  X
} from 'lucide-react';
import { fetchMessages, sendMessage } from '../../store/slices/chatSlice';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { socketService } from '../../services/socket';
import { formatDistanceToNow } from 'date-fns';
import MessageList from './MessageList';
import EmojiPicker from './EmojiPicker';
import FileUploadModal from './FileUploadModal';
import MediaViewer from './MediaViewer';

const MessageArea = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { activeChat, chats, messages, onlineUsers } = useSelector((state) => state.chat);
  
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileUploadPosition, setFileUploadPosition] = useState({ bottom: 0, left: 0 });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerFiles, setMediaViewerFiles] = useState([]);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  
  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const paperclipButtonRef = useRef(null);

  const currentChat = chats.find(chat => chat.id === activeChat);
  const chatMessages = messages[activeChat] || [];
  
  const participant = currentChat?.type !== 'group' 
    ? currentChat?.participants?.find(p => p.id !== user?.id)
    : null;
  
  const isParticipantOnline = participant ? onlineUsers.includes(participant.id) : false;

  useEffect(() => {
    if (activeChat) {
      dispatch(fetchMessages({ chatId: activeChat }));
      socketService.joinChat(activeChat);
      
      return () => {
        socketService.leaveChat(activeChat);
      };
    }
  }, [activeChat, dispatch]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside file upload modal
      if (showFileUploadModal && 
          !event.target.closest('.file-upload-modal') && 
          !event.target.closest('[data-paperclip-button]')) {
        setShowFileUploadModal(false);
      }
      
      // Close other modals
      if (showChatMenu && !event.target.closest('.chat-menu')) {
        setShowChatMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showFileUploadModal, showChatMenu]);

  const handleBackToContacts = () => {
    dispatch(setSidebarOpen(true));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() && uploadedFiles.length === 0) return;

    // Handle file messages
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const fileType = file.type || '';
        const messageData = {
          chatId: activeChat,
          content: messageInput.trim() || '',
          type: fileType.startsWith('image/') ? 'image' : fileType.startsWith('video/') ? 'video' : 'file',
          fileUrl: file.url,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          replyTo: replyingTo ? {
            id: replyingTo.id,
            content: replyingTo.content,
            sender: replyingTo.sender
          } : null,
        };

        try {
          await dispatch(sendMessage(messageData)).unwrap();
        } catch (error) {
          console.error('Failed to send file message:', error);
        }
      }
      
      setUploadedFiles([]);
    } else {
      // Handle text message
      const messageData = {
        chatId: activeChat,
        content: messageInput.trim(),
        type: 'text',
        replyTo: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          sender: replyingTo.sender
        } : null,
      };

      try {
        await dispatch(sendMessage(messageData)).unwrap();
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    setMessageInput('');
    setReplyingTo(null);
    stopTyping();
    
    // Auto-scroll to bottom when sending a message
    setTimeout(() => {
      if (messageListRef.current?.scrollToBottom) {
        messageListRef.current.scrollToBottom();
      }
    }, 100);
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(activeChat);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const stopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socketService.stopTyping(activeChat);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePaperclipClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Paperclip clicked!'); // Debug log
    
    if (paperclipButtonRef.current) {
      const rect = paperclipButtonRef.current.getBoundingClientRect();
      console.log('Button rect:', rect); // Debug log
      
      setFileUploadPosition({
        bottom: window.innerHeight - rect.top,
        left: rect.left + rect.width / 2
      });
    }
    
    setShowFileUploadModal(true);
    setShowEmojiPicker(false); // Close emoji picker if open
  };

  const handleFileSelect = (files, type) => {
    console.log('Files selected:', files, type); // Debug log
    
    const processedFiles = files.map(file => ({
      ...file,
      url: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));
    
    setUploadedFiles(prev => [...prev, ...processedFiles]);
    setShowFileUploadModal(false);
  };

  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove && fileToRemove.url) {
        URL.revokeObjectURL(fileToRemove.url); // Clean up blob URL
      }
      return prev.filter(file => file.id !== fileId);
    });
  };

  const openMediaViewer = (files, index = 0) => {
    setMediaViewerFiles(files);
    setMediaViewerIndex(index);
    setShowMediaViewer(true);
  };

  const handleMediaClick = (message) => {
    // Find all media messages in the current chat
    const mediaMessages = chatMessages.filter(msg => 
      msg.type === 'image' || msg.type === 'video'
    );
    
    const mediaFiles = mediaMessages.map(msg => ({
      url: msg.fileUrl,
      name: msg.fileName || 'Media file',
      type: msg.type === 'image' ? 'image/jpeg' : 'video/mp4'
    }));
    
    const currentIndex = mediaMessages.findIndex(msg => msg.id === message.id);
    openMediaViewer(mediaFiles, currentIndex);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setShowEmojiPicker(false);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const initiateCall = (type) => {
    if (participant) {
      socketService.initiateCall(participant.id, type);
    }
  };

  if (!currentChat) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBackToContacts}
            className="lg:hidden p-2 text-white hover:bg-green-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="relative">
            {currentChat.type === 'group' ? (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {currentChat.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            ) : (
              <img
                src={participant?.avatar || `https://ui-avatars.com/api/?name=${participant?.name}&background=6366f1&color=fff`}
                alt={currentChat.name || participant?.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
              />
            )}
            
            {currentChat.type !== 'group' && isParticipantOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-white">
              {currentChat.name || participant?.name || 'Unknown'}
            </h3>
            <p className="text-xs text-green-100">
              {currentChat.type === 'group' 
                ? `${currentChat.participants?.length} members` 
                : isParticipantOnline ? 'Online' : 'Offline'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentChat.type !== 'group' && (
            <>
              <button
                onClick={() => initiateCall('voice')}
                className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={() => initiateCall('video')}
                className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          
          <div className="relative chat-menu">
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="p-2 text-white hover:bg-green-700 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showChatMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border py-2 w-48 z-10">
                <button className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-gray-700">
                  View Info
                </button>
                <button className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-gray-700">
                  Clear Messages
                </button>
                <button className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-red-600">
                  Delete Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <MessageList 
          ref={messageListRef}
          messages={chatMessages} 
          currentUserId={user?.id}
          onReply={handleReply}
          onMediaClick={handleMediaClick}
        />
      </div>

      {/* File Preview */}
      {uploadedFiles.length > 0 && (
        <div className="bg-gray-100 border-t border-gray-200 p-3">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => {
              const fileType = file.type || '';
              return (
                <div key={file.id} className="relative group">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden border">
                    {fileType.startsWith('image/') ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : fileType.startsWith('video/') ? (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <Video className="w-6 h-6 text-gray-600" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <Paperclip className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeUploadedFile(file.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-gray-100 border-t border-gray-200 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-1 h-8 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Replying to {replyingTo.sender?.name}
                  </p>
                  <p className="text-sm text-gray-600 truncate max-w-xs">
                    {replyingTo.content}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={cancelReply}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-white p-4 border-t">
        {showEmojiPicker && (
          <div className="mb-4">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            <button
              ref={paperclipButtonRef}
              type="button"
              onClick={handlePaperclipClick}
              data-paperclip-button="true"
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={handleInputChange}
              placeholder={
                uploadedFiles.length > 0 
                  ? "Add a caption..." 
                  : replyingTo 
                    ? `Reply to ${replyingTo.sender?.name}...` 
                    : "Type a message..."
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-base"
            />
          </div>

          {(messageInput.trim() || uploadedFiles.length > 0) ? (
            <button
              type="submit"
              className="p-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-full transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onFileSelect={handleFileSelect}
        position={fileUploadPosition}
      />

      {/* Media Viewer */}
      <MediaViewer
        isOpen={showMediaViewer}
        onClose={() => setShowMediaViewer(false)}
        files={mediaViewerFiles}
        initialIndex={mediaViewerIndex}
      />
    </div>
  );
};

export default MessageArea;