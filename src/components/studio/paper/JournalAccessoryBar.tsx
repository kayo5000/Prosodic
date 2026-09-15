import React, { useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import type { FileAttachmentData, MediaAttachmentData } from './types';

interface JournalAccessoryBarProps {
  onOpenRecommend: () => void;
  onAttachPhotos: (attachments: MediaAttachmentData[]) => void;
  onAttachCamera: (attachment: MediaAttachmentData) => void;
  onOpenAudio: () => void;
  onAttachFiles: (files: FileAttachmentData[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function JournalAccessoryBar({
  onOpenRecommend,
  onAttachPhotos,
  onAttachCamera,
  onOpenAudio,
  onAttachFiles,
}: JournalAccessoryBarProps) {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const attachments: MediaAttachmentData[] = [];
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video');
      const url = URL.createObjectURL(file);
      attachments.push({
        uri: url,
        type: isVideo ? 'video' : 'image',
        name: file.name,
        size: formatFileSize(file.size),
        caption: file.name,
      });
    });

    onAttachPhotos(attachments);
    e.target.value = '';
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isVideo = file.type.startsWith('video');
    const url = URL.createObjectURL(file);

    onAttachCamera({
      uri: url,
      type: isVideo ? 'video' : 'image',
      name: file.name,
      size: formatFileSize(file.size),
      caption: 'Captured Media',
    });
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const attached: FileAttachmentData[] = [];
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      attached.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: formatFileSize(file.size),
        uri: url,
        type: file.type || 'application/octet-stream',
      });
    });

    onAttachFiles(attached);
    e.target.value = '';
  };

  const triggerPhotoPicker = () => {
    if (Platform.OS === 'web' && photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const triggerCameraPicker = () => {
    if (Platform.OS === 'web' && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const triggerFilePicker = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      {/* Hidden File Inputs for Web */}
      {Platform.OS === 'web' && (
        <div style={{ display: 'none' }}>
          <input
            ref={photoInputRef as any}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handlePhotoChange as any}
          />
          <input
            ref={cameraInputRef as any}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleCameraChange as any}
          />
          <input
            ref={fileInputRef as any}
            type="file"
            accept="*/*"
            multiple
            onChange={handleFileChange as any}
          />
        </div>
      )}

      {/* Floating Dark Pill Toolbar */}
      <View style={styles.toolbarPill}>
        {/* 1. Recommend (Vector Star) */}
        <Pressable
          onPress={onOpenRecommend}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Recommend songwriting suggestions and mood"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFD60A"
            strokeWidth="2.0"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            <path d="M12 2.5 L14.3 8.6 C14.7 9.6 15.5 10.4 16.5 10.8 L22.6 13 L16.5 15.2 C15.5 15.6 14.7 16.4 14.3 17.4 L12 23.5 L9.7 17.4 C9.3 16.4 8.5 15.6 7.5 15.2 L1.4 13 L7.5 10.8 C8.5 10.4 9.3 9.6 9.7 8.6 Z" />
            <path
              d="M19 3.5 L19.7 5.2 L21.4 5.9 L19.7 6.6 L19 8.3 L18.3 6.6 L16.6 5.9 L18.3 5.2 Z"
              fill="#FFD60A"
              stroke="none"
              opacity="0.9"
            />
          </svg>
        </Pressable>

        {/* 2. Photos (Vector Image Frame) */}
        <Pressable
          onPress={triggerPhotoPicker}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open Photos gallery"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F2F2F7"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
            <circle cx="8.5" cy="8.5" r="1.6" />
            <path d="M21 15.5 L16.2 10.7 C15.8 10.3 15.2 10.3 14.8 10.7 L5 20.5" />
            <path d="M14 14.5 L15.7 12.8 C16.1 12.4 16.7 12.4 17.1 12.8 L21 16.7" />
          </svg>
        </Pressable>

        {/* 3. Camera (Vector Camera) */}
        <Pressable
          onPress={triggerCameraPicker}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open Camera to capture photo or video"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F2F2F7"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </Pressable>

        {/* 4. Audio (Vector Waveform) */}
        <Pressable
          onPress={onOpenAudio}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open voice and audio recording"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF453A"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            {/* Audio waveform pattern matching Apple Journal / Voice Memos */}
            <line x1="4" y1="10" x2="4" y2="14" />
            <line x1="8" y1="7" x2="8" y2="17" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="16" y1="7" x2="16" y2="17" />
            <line x1="20" y1="10" x2="20" y2="14" />
          </svg>
        </Pressable>

        {/* 5. Files (Vector Paperclip) */}
        <Pressable
          onPress={triggerFilePicker}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Attach files with large size limit"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F2F2F7"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 24 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  toolbarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 28, 30, 0.94)',
    borderRadius: 30,
    height: 54,
    paddingHorizontal: 22,
    minWidth: 310,
    maxWidth: 380,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(25px) saturate(180%)',
          WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        } as any)
      : {}),
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.92 }],
  },
  iconGlyph: {
    fontSize: 20,
    color: '#F2F2F7',
  },
});
