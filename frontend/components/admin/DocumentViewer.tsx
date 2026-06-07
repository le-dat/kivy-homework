'use client';

import { useState } from 'react';

interface DocumentViewerProps {
  documentUrl: string;
}

export default function DocumentViewer({ documentUrl }: DocumentViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    try {
      const parsed = new URL(apiUrl);
      return `${parsed.protocol}//${parsed.host}${url}`;
    } catch {
      return `http://localhost:5000${url}`;
    }
  };

  const fullUrl = getFullUrl(documentUrl);
  const isPdf = documentUrl.toLowerCase().endsWith('.pdf');

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateLeft = () => setRotation((prev) => (prev - 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  if (!documentUrl) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 font-body text-sm bg-black/20 rounded-md">
        No document to display.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-md border border-white/10 overflow-hidden">
      {!isPdf && (
        <div className="flex items-center justify-between p-3 bg-black/50 border-b border-white/10">
          <span className="font-body text-xs text-white/60">Verification Image</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors text-xs font-semibold cursor-pointer"
            >
              ➕ Zoom In
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors text-xs font-semibold cursor-pointer"
            >
              ➖ Zoom Out
            </button>
            <button
              onClick={handleRotateLeft}
              title="Rotate Left"
              className="p-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors text-xs font-semibold cursor-pointer"
            >
              🔄 Left
            </button>
            <button
              onClick={handleRotateRight}
              title="Rotate Right"
              className="p-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors text-xs font-semibold cursor-pointer"
            >
              🔄 Right
            </button>
            <button
              onClick={handleReset}
              title="Reset"
              className="p-1.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors text-xs font-semibold cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative min-h-[300px]">
        {isPdf ? (
          <iframe
            src={`${fullUrl}#toolbar=1`}
            className="w-full h-full border-none rounded-sm min-h-[450px]"
            title="PDF Document Viewer"
          />
        ) : (
          <div className="relative overflow-visible">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullUrl}
              alt="Verification business license doc"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s cubic-bezier(0.1, 0.8, 0.2, 1)',
                maxHeight: '400px',
                objectFit: 'contain',
              }}
              className="rounded-sm shadow-md pointer-events-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
