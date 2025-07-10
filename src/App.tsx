import { useState } from 'react';
import axios from 'axios';
import './App.css';
import ChatInterface from './ChatInterface';

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
  const [showChat, setShowChat] = useState(false);
  const [filesProcessed, setFilesProcessed] = useState(false);

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
    setFilesProcessed(false);
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

  const openChat = () => {
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
  };

  // Show chat interface if user clicked to open it
  if (showChat) {
    return <ChatInterface onBack={closeChat} />;
  }

  return (
    <div className="app-container">
      <h1>File Upload & Processing</h1>
      
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
            📁 Choose Files
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
          
          {filesProcessed && (
            <button 
              onClick={openChat}
              className="btn btn-chat"
            >
              💬 Chat with Documents
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
  );
};

export default App;
