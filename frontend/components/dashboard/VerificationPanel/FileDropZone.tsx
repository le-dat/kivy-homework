'use client';

import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { MAX_FILE_SIZE, ALLOWED_TYPES } from './constants';

interface FileDropZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  setError: (error: string) => void;
}

export default function FileDropZone({
  file,
  onFileSelect,
  setError,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) return 'Only PDF, PNG, JPG files are allowed';
    if (f.size > MAX_FILE_SIZE) return 'File must be smaller than 2MB';
    return null;
  };

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
      setError('');
      onFileSelect(f);
    },
    [onFileSelect, setError]
  );

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div
      className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer
        ${isDragging ? 'border-secondary bg-secondary/5' : 'border-white/20'}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center gap-2 text-white/70 font-body text-sm"
      >
        <span className="text-3xl">📄</span>
        <span>{file ? file.name : 'Drag and drop file or click to choose'}</span>
        <span className="text-xs text-white/40">PDF, PNG, JPG — max 2MB</span>
      </label>
    </div>
  );
}
