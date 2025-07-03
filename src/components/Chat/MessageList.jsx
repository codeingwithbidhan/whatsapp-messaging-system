import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Check, CheckCheck, Clock, Reply, Heart, ThumbsUp, Laugh, Angry, Salad as Sad, MoreHorizontal, Play, Download, FileText, File, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import VoicePlayer from './VoicePlayer';

const MessageList = forwardRef(({ messages, currentUserId, onReply, onMediaClick }, ref) => {
  const [stickyDate, setStickyDate] = useState('');
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const scrollContainerRef = useRef(null);
  const dateRefs = useRef({});
  const messageRefs = useRef({});

  // Available reactions
  const reactions = [
    { emoji: '❤️', name: 'love', icon: Heart },
    { emoji: '👍', name: 'like', icon: ThumbsUp },
    { emoji: '😂', name: 'laugh', icon: Laugh },
    { emoji: '😢', name: 'sad', icon: Sad },
    { emoji: '😡', name: 'angry', icon: Angry },
  ];

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    scrollToBottom: (smooth = true) => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'instant'
        });
      }
    },
    scrollToMessage: (messageId) => {
      const messageElement = messageRefs.current[messageId];
      if (messageElement && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const messageRect = messageElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate the scroll position to center the message
        const scrollTop = container.scrollTop + messageRect.top - containerRect.top - (containerRect.height / 2) + (messageRect.height / 2);
        
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        
        // Highlight the message briefly
        messageElement.classList.add('bg-yellow-100', 'border-yellow-300');
        setTimeout(() => {
          messageElement.classList.remove('bg-yellow-100', 'border-yellow-300');
        }, 2000);
      }
    }
  }));

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentGroup = null;
    
    messages.forEach((message) => {
      const messageDate = format(new Date(message.createdAt), 'yyyy-MM-dd');
      
      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = {
          date: messageDate,
          messages: [message],
        };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
      }
    });
    
    return groups;
  };

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM dd, yyyy');
    }
  };

  const handleMessageLongPress = (message) => {
    setSelectedMessage(message);
  };

  const handleReaction = (messageId, reaction) => {
    // Mock reaction handling - in real app, this would call an API
    console.log('Adding reaction:', { messageId, reaction });
    setShowReactionPicker(null);
  };

  const handleReply = (message) => {
    if (onReply) {
      onReply(message);
    }
    setSelectedMessage(null);
  };

  const handleReplyClick = (repliedToMessage) => {
    // Find the original message and scroll to it
    const originalMessage = messages.find(m => m.id === repliedToMessage.id);
    if (originalMessage && messageRefs.current[originalMessage.id]) {
      const messageElement = messageRefs.current[originalMessage.id];
      const container = scrollContainerRef.current;
      
      if (messageElement && container) {
        const messageRect = messageElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate scroll position to center the message
        const scrollTop = container.scrollTop + messageRect.top - containerRect.top - (containerRect.height / 2) + (messageRect.height / 2);
        
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        
        // Highlight the message
        messageElement.classList.add('bg-blue-50', 'border-blue-300', 'border-2');
        setTimeout(() => {
          messageElement.classList.remove('bg-blue-50', 'border-blue-300', 'border-2');
        }, 2000);
      }
    }
  };

  const handleMediaClick = (message) => {
    if (onMediaClick) {
      onMediaClick(message);
    }
  };

  const handleFileDownload = (message) => {
    const link = document.createElement('a');
    link.href = message.fileUrl;
    link.download = message.fileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (fileName, fileType) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    const type = fileType?.toLowerCase();
    
    // PDF files
    if (extension === 'pdf' || type?.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    
    // Word documents
    if (['doc', 'docx'].includes(extension) || type?.includes('word') || type?.includes('document')) {
      return <FileText className="w-8 h-8 text-blue-500" />;
    }
    
    // Excel files
    if (['xls', 'xlsx'].includes(extension) || type?.includes('excel') || type?.includes('spreadsheet')) {
      return <FileText className="w-8 h-8 text-green-500" />;
    }
    
    // PowerPoint files
    if (['ppt', 'pptx'].includes(extension) || type?.includes('powerpoint') || type?.includes('presentation')) {
      return <FileText className="w-8 h-8 text-orange-500" />;
    }
    
    // Text files
    if (['txt', 'rtf'].includes(extension) || type?.includes('text')) {
      return <FileText className="w-8 h-8 text-gray-500" />;
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension) || type?.includes('zip') || type?.includes('archive')) {
      return <File className="w-8 h-8 text-purple-500" />;
    }
    
    // Default file icon
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const getFileTypeLabel = (fileName, fileType) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    const type = fileType?.toLowerCase();
    
    if (extension === 'pdf' || type?.includes('pdf')) return 'PDF Document';
    if (['doc', 'docx'].includes(extension) || type?.includes('word')) return 'Word Document';
    if (['xls', 'xlsx'].includes(extension) || type?.includes('excel')) return 'Excel Spreadsheet';
    if (['ppt', 'pptx'].includes(extension) || type?.includes('powerpoint')) return 'PowerPoint Presentation';
    if (['txt', 'rtf'].includes(extension) || type?.includes('text')) return 'Text Document';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'Archive File';
    
    return 'Document';
  };

  // Handle scroll to update sticky date
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Check if we're at the bottom (hide sticky header)
    const isAtBottom = scrollTop + containerHeight >= container.scrollHeight - 50;
    
    if (isAtBottom) {
      setShowStickyHeader(false);
      return;
    }

    // Show sticky header when scrolling up from bottom
    if (scrollTop > 100) {
      setShowStickyHeader(true);
    } else {
      setShowStickyHeader(false);
      return;
    }

    // Find which date section is currently at the top of the viewport
    let currentVisibleDate = '';
    let minDistance = Infinity;
    
    Object.entries(dateRefs.current).forEach(([date, ref]) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate distance from top of container
        const distanceFromTop = Math.abs(rect.top - containerRect.top);
        
        // Find the closest date header to the top
        if (rect.top <= containerRect.top + 200 && distanceFromTop < minDistance) {
          minDistance = distanceFromTop;
          currentVisibleDate = date;
        }
      }
    });

    if (currentVisibleDate && currentVisibleDate !== stickyDate) {
      setStickyDate(currentVisibleDate);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if user was near bottom before new message
    const wasNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
    
    if (wasNearBottom) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [messages]);

  // Add scroll listener with throttling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;
    
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => container.removeEventListener('scroll', throttledHandleScroll);
  }, [stickyDate]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.message-actions')) {
        setSelectedMessage(null);
        setShowReactionPicker(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const messageGroups = groupMessagesByDate(messages);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <div className="bg-gray-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm">Start the conversation by sending a message</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Sticky Date Header - Fixed positioning */}
      {showStickyHeader && stickyDate && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pointer-events-none">
          <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-green-600 animate-fade-in pointer-events-auto">
            {getDateLabel(stickyDate)}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent scroll-smooth"
        style={{ paddingTop: showStickyHeader ? '60px' : '0' }}
      >
        <div className="p-4 space-y-6">
          {messageGroups.map((group, groupIndex) => (
            <div 
              key={group.date} 
              className="space-y-4"
              ref={(el) => {
                if (el) {
                  dateRefs.current[group.date] = el;
                }
              }}
            >
              {/* Date Separator */}
              <div className="flex items-center justify-center sticky top-0 z-10 py-2">
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm border border-green-200">
                  {getDateLabel(group.date)}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((message, messageIndex) => {
                  const isOwnMessage = message.sender?.id === currentUserId;
                  const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                  const nextMessage = messageIndex < group.messages.length - 1 ? group.messages[messageIndex + 1] : null;
                  
                  // Check if this message is part of a consecutive group from the same sender
                  const isFirstInGroup = !prevMessage || prevMessage.sender?.id !== message.sender?.id;
                  const isLastInGroup = !nextMessage || nextMessage.sender?.id !== message.sender?.id;
                  
                  return (
                    <div
                      key={message.id}
                      ref={(el) => {
                        if (el) {
                          messageRefs.current[message.id] = el;
                        }
                      }}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} message-enter relative group`}
                    >
                      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                        isOwnMessage ? 'order-2' : 'order-1'
                      } relative`}>
                        {/* Reply Preview */}
                        {message.replyTo && (
                          <div 
                            onClick={() => handleReplyClick(message.replyTo)}
                            className={`mb-2 p-2 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                              isOwnMessage 
                                ? 'bg-green-50 border-green-400 ml-4' 
                                : 'bg-gray-50 border-gray-400 mr-4'
                            }`}
                          >
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              {message.replyTo.sender?.name}
                            </p>
                            <p className="text-sm text-gray-700 truncate">
                              {message.replyTo.content}
                            </p>
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2 transition-all duration-200 ${
                            isOwnMessage
                              ? 'bg-green-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                          } ${
                            // Adjust border radius for message grouping
                            isOwnMessage
                              ? isFirstInGroup
                                ? isLastInGroup
                                  ? 'rounded-2xl'
                                  : 'rounded-2xl rounded-br-md'
                                : isLastInGroup
                                ? 'rounded-2xl rounded-tr-md'
                                : 'rounded-r-md rounded-l-2xl'
                              : isFirstInGroup
                                ? isLastInGroup
                                  ? 'rounded-2xl'
                                  : 'rounded-2xl rounded-bl-md'
                                : isLastInGroup
                                ? 'rounded-2xl rounded-tl-md'
                                : 'rounded-l-md rounded-r-2xl'
                          }`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleMessageLongPress(message);
                          }}
                          onTouchStart={(e) => {
                            const touchStartTime = Date.now();
                            const touchTimer = setTimeout(() => {
                              handleMessageLongPress(message);
                            }, 500);
                            
                            const handleTouchEnd = () => {
                              clearTimeout(touchTimer);
                              document.removeEventListener('touchend', handleTouchEnd);
                            };
                            
                            document.addEventListener('touchend', handleTouchEnd);
                          }}
                        >
                          {/* Sender name for group chats */}
                          {!isOwnMessage && message.chat?.type === 'group' && isFirstInGroup && (
                            <p className="text-xs font-semibold text-blue-600 mb-1">
                              {message.sender?.name}
                            </p>
                          )}
                          
                          {/* Message content */}
                          <div className="space-y-2">
                            {message.type === 'text' && (
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {message.content}
                              </p>
                            )}
                            
                            {message.type === 'image' && (
                              <div className="space-y-2">
                                <div 
                                  className="cursor-pointer rounded-lg overflow-hidden"
                                  onClick={() => handleMediaClick(message)}
                                >
                                  <img
                                    src={message.fileUrl}
                                    alt="Shared image"
                                    className="rounded-lg max-w-full h-auto hover:opacity-90 transition-opacity"
                                  />
                                </div>
                                {message.content && (
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {message.type === 'video' && (
                              <div className="space-y-2">
                                <div 
                                  className="relative cursor-pointer rounded-lg overflow-hidden group"
                                  onClick={() => handleMediaClick(message)}
                                >
                                  {message.thumbnailUrl ? (
                                    <img
                                      src={message.thumbnailUrl}
                                      alt="Video thumbnail"
                                      className="rounded-lg max-w-full h-auto"
                                    />
                                  ) : (
                                    <video
                                      src={message.fileUrl}
                                      className="rounded-lg max-w-full h-auto"
                                      poster={message.thumbnailUrl}
                                      preload="metadata"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-40 transition-all">
                                    <div className="bg-white bg-opacity-90 rounded-full p-3">
                                      <Play className="w-6 h-6 text-gray-800" />
                                    </div>
                                  </div>
                                </div>
                                {message.content && (
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {message.type === 'file' && (
                              <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 border-dashed transition-colors hover:bg-opacity-80 ${
                                isOwnMessage 
                                  ? 'bg-green-400 bg-opacity-20 border-green-300' 
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <div className="flex-shrink-0">
                                  {getFileIcon(message.fileName, message.fileType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${
                                    isOwnMessage ? 'text-white' : 'text-gray-800'
                                  }`}>
                                    {message.fileName || 'Unknown file'}
                                  </p>
                                  <p className={`text-xs ${
                                    isOwnMessage ? 'text-green-100' : 'text-gray-500'
                                  }`}>
                                    {getFileTypeLabel(message.fileName, message.fileType)}
                                  </p>
                                  {message.fileSize && (
                                    <p className={`text-xs ${
                                      isOwnMessage ? 'text-green-100' : 'text-gray-500'
                                    }`}>
                                      {message.fileSize}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleFileDownload(message)}
                                  className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                                    isOwnMessage 
                                      ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white' 
                                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                                  }`}
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            
                            {message.type === 'voice' && (
                              <VoicePlayer
                                audioUrl={message.fileUrl}
                                duration={message.duration}
                                isOwnMessage={isOwnMessage}
                                className={`${
                                  isOwnMessage 
                                    ? 'bg-green-400 bg-opacity-20' 
                                    : 'bg-gray-100'
                                } rounded-lg`}
                              />
                            )}

                            {/* Caption for files */}
                            {(message.type === 'file') && message.content && (
                              <p className="text-sm whitespace-pre-wrap break-words mt-2">
                                {message.content}
                              </p>
                            )}
                          </div>

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {message.reactions.map((reaction, index) => (
                                <div
                                  key={index}
                                  className="bg-white bg-opacity-20 rounded-full px-2 py-1 text-xs flex items-center space-x-1"
                                >
                                  <span>{reaction.emoji}</span>
                                  <span className="text-xs">{reaction.count}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Message metadata - only show on last message in group */}
                          {isLastInGroup && (
                            <div className={`flex items-center justify-end space-x-1 mt-2 ${
                              isOwnMessage ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              <span className="text-xs">
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {isOwnMessage && (
                                <div className="flex-shrink-0">
                                  {getMessageStatusIcon(message.status)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Message Actions - Show on hover/selection */}
                        {(selectedMessage?.id === message.id || showReactionPicker === message.id) && (
                          <div className={`message-actions absolute top-0 ${
                            isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
                          } flex items-center space-x-1 bg-white rounded-lg shadow-lg border p-1 z-20`}>
                            <button
                              onClick={() => handleReply(message)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Reply"
                            >
                              <Reply className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            <div className="relative">
                              <button
                                onClick={() => setShowReactionPicker(
                                  showReactionPicker === message.id ? null : message.id
                                )}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="React"
                              >
                                <Heart className="w-4 h-4 text-gray-600" />
                              </button>
                              
                              {/* Reaction Picker */}
                              {showReactionPicker === message.id && (
                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-2 flex space-x-1">
                                  {reactions.map((reaction) => (
                                    <button
                                      key={reaction.name}
                                      onClick={() => handleReaction(message.id, reaction)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-lg"
                                      title={reaction.name}
                                    >
                                      {reaction.emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <button
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="More"
                            >
                              <MoreHorizontal className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        )}

                        {/* Quick Reaction Buttons - Show on hover for desktop */}
                        <div className={`hidden lg:flex absolute top-0 ${
                          isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
                        } items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-lg shadow-lg border p-1`}>
                          <button
                            onClick={() => handleReply(message)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Reply"
                          >
                            <Reply className="w-3 h-3 text-gray-600" />
                          </button>
                          
                          {reactions.slice(0, 3).map((reaction) => (
                            <button
                              key={reaction.name}
                              onClick={() => handleReaction(message.id, reaction)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors text-sm"
                              title={reaction.name}
                            >
                              {reaction.emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Avatar for received messages - only show on last message in group */}
                      {!isOwnMessage && isLastInGroup && (
                        <div className="order-1 mr-2 flex-shrink-0 self-end">
                          <img
                            src={message.sender?.avatar || `https://ui-avatars.com/api/?name=${message.sender?.name}&background=6366f1&color=fff`}
                            alt={message.sender?.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;