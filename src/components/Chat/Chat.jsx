import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import MessageArea from './MessageArea';
import { fetchChats } from '../../store/slices/chatSlice';
import { setSidebarOpen } from '../../store/slices/uiSlice';

const Chat = () => {
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state) => state.ui);
  const { activeChat } = useSelector((state) => state.chat);

  useEffect(() => {
    dispatch(fetchChats());
  }, [dispatch]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // On mobile, show sidebar by default when no chat is active
        dispatch(setSidebarOpen(!activeChat));
      } else {
        // On desktop, always show sidebar
        dispatch(setSidebarOpen(true));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch, activeChat]);

  // Mobile view logic
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    return (
      <div className="h-screen bg-gray-100 flex overflow-hidden">
        {/* Mobile: Show either sidebar or message area, not both */}
        {!activeChat || sidebarOpen ? (
          <div className="w-full">
            <Sidebar />
          </div>
        ) : (
          <div className="w-full">
            <MessageArea />
          </div>
        )}
      </div>
    );
  }

  // Desktop view (original layout)
  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <Sidebar />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChat ? (
          <MessageArea />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="bg-green-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-green-600 text-4xl font-bold">W</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Welcome to WhatsApp Web
              </h2>
              <p className="text-gray-600 max-w-md">
                Send and receive messages without keeping your phone online.
                Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;