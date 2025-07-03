import React, { useState, useRef } from 'react';
import { X, Image, Video, FileText, Upload, Camera, Film, File } from 'lucide-react';

const FileUploadModal = ({ isOpen, onClose, onFileSelect, position }) => {
  const [dragOver, setDragOver] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files);
    }
  };

  const handleFileInput = (files, type) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log('File input triggered:', fileArray, type); // Debug log
      onFileSelect(fileArray, type);
    }
  };

  const uploadOptions = [
    {
      id: 'photos',
      title: 'Photos',
      icon: Image,
      color: 'bg-blue-500 hover:bg-blue-600',
      accept: 'image/*',
      multiple: true,
      ref: photoInputRef,
      description: 'Upload images (JPG, PNG, GIF)'
    },
    {
      id: 'videos',
      title: 'Videos',
      icon: Video,
      color: 'bg-purple-500 hover:bg-purple-600',
      accept: 'video/*',
      multiple: true,
      ref: videoInputRef,
      description: 'Upload videos (MP4, MOV, AVI)'
    },
    {
      id: 'documents',
      title: 'Documents',
      icon: FileText,
      color: 'bg-green-500 hover:bg-green-600',
      accept: '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.ods,.odp',
      multiple: true,
      ref: documentInputRef,
      description: 'Upload documents (PDF, DOC, XLS, PPT, etc.)'
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="file-upload-modal fixed z-50 bg-white rounded-lg shadow-xl border max-w-sm w-full"
        style={{
          bottom: position.bottom + 10,
          left: Math.max(10, Math.min(position.left - 200, window.innerWidth - 410)),
          transform: 'translateX(0)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Share Files</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Upload Options */}
        <div className="p-4 space-y-3">
          {uploadOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <div key={option.id}>
                <input
                  ref={option.ref}
                  type="file"
                  accept={option.accept}
                  multiple={option.multiple}
                  onChange={(e) => {
                    console.log('Input change event:', e.target.files); // Debug log
                    handleFileInput(e.target.files, option.id);
                  }}
                  className="hidden"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Button clicked for:', option.id); // Debug log
                    option.ref.current?.click();
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-white transition-colors ${option.color}`}
                >
                  <div className="flex-shrink-0">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{option.title}</p>
                    <p className="text-sm opacity-90">{option.description}</p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Drag & Drop Area */}
        <div 
          className={`m-4 mt-0 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            Or drag and drop files here
          </p>
          <p className="text-xs text-gray-500">
            Multiple files supported
          </p>
        </div>
      </div>
    </>
  );
};

export default FileUploadModal;