// FileUpload.tsx
import { useState } from 'react';
import axios from 'axios';

interface FileInfo {
  file: File;
  name: string;
  id: string; // Added to help with unique identification
}

const FileUpload = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const newFileInfos: FileInfo[] = selectedFiles.map(file => ({
      file,
      name: file.name,
      id: `${file.name}-${Date.now()}-${Math.random()}`
    }));
    
    // Combine existing files with new files
    setFiles(prevFiles => [...prevFiles, ...newFileInfos]);
    setError(null);
  };

  const removeFile = (id: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    
    try {
      const uploadPromises = files.map(async (fileInfo) => {
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            try {
              const response = await axios.post(
                'https://5hyi7dh4nl.execute-api.us-east-1.amazonaws.com/dev/upload',
                { 
                  file_data: base64Data,
                  file_name: fileInfo.name
                }
              );
              resolve(response);
            } catch (err) {
              reject(err);
            }
          };

          reader.onerror = () => reject(new Error('File reading failed'));
          reader.readAsDataURL(fileInfo.file);
        });
      });

      await Promise.all(uploadPromises);
      alert('All files uploaded successfully!');
      setFiles([]);
    } catch (err) {
      setError('Upload failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={handleFileChange}
          disabled={loading}
          multiple
        />
        <button type="submit" disabled={loading || files.length === 0}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {files.length > 0 && (
        <div>
          <p>Selected files:</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {files.map((fileInfo) => (
              <li 
                key={fileInfo.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}
              >
                <span>{fileInfo.name}</span>
                <button
                  onClick={() => removeFile(fileInfo.id)}
                  style={{
                    marginLeft: '10px',
                    padding: '2px 6px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default FileUpload;



/*
import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }, []);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }

  function deleteTodo(id: string) {
    client.models.Todo.delete({ id })
  }

  return (
    <main>
      <h1>My todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li           
          onClick={() => deleteTodo(todo.id)}
          key={todo.id}>{todo.content}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;
*/