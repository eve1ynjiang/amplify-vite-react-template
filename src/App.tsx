import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import ChatInterface from './ChatInterface';
import ChatHistory from './ChatHistory';
import { Conversation, chatHistoryAPI } from './services/chatHistoryApi';

interface FileInfo {
  file: File;
  name: string;
  id: string;
  uploaded: boolean;
}

const App = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [, setFilesProcessed] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [, setConversations] = useState<Conversation[]>([]);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const loadedConversations = await chatHistoryAPI.getAllConversations();
      setConversations(loadedConversations);
      if (loadedConversations.length > 0 && !currentConversation) {
        setCurrentConversation(loadedConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const newFiles: FileInfo[] = selectedFiles.map(file => ({
      file,
      name: file.name,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      uploaded: false
    }));
    
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    setMessage('');
  };

  const removeFile = (id: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setMessage('Please select files first');
      return;
    }

    setUploading(true);
    setMessage('Uploading files...');

    try {
      const uploadPromises = files.map(async (fileInfo) => {
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            try {
              await axios.post(
                'https://5hyi7dh4nl.execute-api.us-east-1.amazonaws.com/dev/upload',
                { 
                  file_data: base64Data,
                  file_name: fileInfo.name
                }
              );
              resolve(fileInfo.id);
            } catch (err) {
              reject(err);
            }
          };

          reader.onerror = () => reject(new Error('File reading failed'));
          reader.readAsDataURL(fileInfo.file);
        });
      });

      await Promise.all(uploadPromises);
      
      // Mark all files as uploaded
      setFiles(prevFiles => 
        prevFiles.map(f => ({ ...f, uploaded: true }))
      );
      
      setMessage('All files uploaded successfully! You can now process them.');
    } catch (err) {
      setMessage('Upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const processFiles = async () => {
    const uploadedFiles = files.filter(f => f.uploaded);
    
    if (uploadedFiles.length === 0) {
      setMessage('No uploaded files to process');
      return;
    }

    setProcessing(true);
    setMessage('Processing files...');

    try {
      const response = await axios.post(
        'https://5hyi7dh4nl.execute-api.us-east-1.amazonaws.com/dev/update',
        {
          files: uploadedFiles.map(f => f.name)
        }
      );
      
      if (response.status === 200) {
        setMessage('Files processed successfully! Knowledge base updated. You can now chat with your documents.');
        setFilesProcessed(true);
      }
    } catch (err) {
      setMessage('Processing failed: ' + (err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setMessage('');
    setFilesProcessed(false);
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      // Load the full conversation from API
      const fullConversation = await chatHistoryAPI.getConversation(conversation.id);
      setCurrentConversation(fullConversation);
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Fallback to the conversation data we have
      setCurrentConversation(conversation);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConversation = await chatHistoryAPI.createConversation();
      setCurrentConversation(newConversation);
      await loadConversations(); // Reload the conversation list
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  return (
    <div className="app-container">
      <div className="split-layout">
        <div className="upload-panel">
          {/* Chat History */}
          <ChatHistory
            currentConversationId={currentConversation?.id || ''}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />

          {/* File Upload Section */}
          <div className="file-upload-section">
            <h2 className="upload-title">Upload Files</h2>
            
            {/* File Selection */}
            <div className="upload-section">
              <div className="file-input-wrapper">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  multiple
                  className="file-input"
                  id="file-upload"
                  disabled={uploading || processing}
                />
                <label htmlFor="file-upload" className="file-label">
                  Choose Files
                </label>
              </div>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="files-section">
                <div className="section-header">
                  <h3>Selected Files ({files.length})</h3>
                  <button onClick={clearAll} className="btn btn-clear">
                    Clear All
                  </button>
                </div>
                
                <div className="file-list">
                  {files.map((fileInfo) => (
                    <div key={fileInfo.id} className="file-item">
                      <div className="file-info">
                        <span className="file-name">{fileInfo.name}</span>
                        {fileInfo.uploaded && <span className="uploaded-badge">✓ Uploaded</span>}
                      </div>
                      <button
                        onClick={() => removeFile(fileInfo.id)}
                        className="btn btn-remove"
                        disabled={uploading || processing}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {files.length > 0 && (
              <div className="action-section">
                <button 
                  onClick={uploadFiles}
                  disabled={uploading || processing || files.every(f => f.uploaded)}
                  className="btn btn-primary"
                >
                  {uploading ? '⏳ Uploading...' : '📤 Upload Files'}
                </button>
                
                {files.some(f => f.uploaded) && (
                  <button 
                    onClick={processFiles}
                    disabled={uploading || processing}
                    className="btn btn-success"
                  >
                    {processing ? '⏳ Processing...' : '⚡ Process Files'}
                  </button>
                )}
              </div>
            )}

            {/* Status Message */}
            {message && (
              <div className={`message ${message.includes('failed') || message.includes('error') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="chat-panel">
          <ChatInterface 
            embedded={true}
            onBack={undefined}
            currentConversation={currentConversation}
            onConversationUpdate={(updatedConversation) => {
              setCurrentConversation(updatedConversation);
              loadConversations(); // Reload the conversation list when chat updates
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
