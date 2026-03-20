'use client';

import { useState, useRef, useCallback } from 'react';

export interface UploadedFile {
  file: File;
  preview?: string;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  compact?: boolean;
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 5 * 1024 * 1024;

export default function FileUpload({ files, onFilesChange, disabled, maxFiles = 3, compact }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAdd = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const current = [...files];
      const toAdd = Array.from(newFiles);

      for (const file of toAdd) {
        if (current.length >= maxFiles) {
          setError(`最大${maxFiles}ファイルまでです`);
          break;
        }
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError('対応形式: JPG, PNG, PDF, DOCX');
          continue;
        }
        if (file.size > MAX_SIZE) {
          setError('ファイルサイズは5MB以下にしてください');
          continue;
        }
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        current.push({ file, preview });
      }

      onFilesChange(current);
    },
    [files, onFilesChange, maxFiles]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updated = [...files];
      if (updated[index]?.preview) URL.revokeObjectURL(updated[index].preview!);
      updated.splice(index, 1);
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) validateAndAdd(e.dataTransfer.files);
    },
    [validateAndAdd]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) validateAndAdd(e.target.files);
      if (inputRef.current) inputRef.current.value = '';
    },
    [validateAndAdd]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'IMG';
    if (type.includes('pdf')) return 'PDF';
    return 'DOC';
  };

  const canAdd = files.length < maxFiles;

  return (
    <div>
      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((uf, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              {uf.preview ? (
                <img src={uf.preview} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: '#E3F2FD', color: '#1565C0' }}>
                  {getFileIcon(uf.file.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-800 truncate">{uf.file.name}</p>
                <p className="text-[11px] text-gray-400">{formatSize(uf.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={disabled}
                className="text-gray-400 hover:text-red-500 transition p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl ${compact ? 'p-4' : 'p-6'} text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[#1565C0] bg-[#E3F2FD]'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <svg className="w-6 h-6 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          <p className="text-[13px] text-gray-500">
            写真、PDF、Wordをドロップ or <span className="text-[#1565C0] font-medium">タップして選択</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            JPG, PNG, PDF, DOCX（各5MB以下・最大{maxFiles}つ）
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.pdf,.docx"
        onChange={handleChange}
        disabled={disabled}
        multiple
      />
      {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
    </div>
  );
}
