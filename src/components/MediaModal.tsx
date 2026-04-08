'use client';

import { useState, useEffect, useRef } from 'react';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import styles from './MediaModal.module.css';

interface MediaFile {
  name: string;
  url: string;
  path: string;
}

interface MediaModalProps {
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}

type Tab = 'library' | 'upload';

export default function MediaModal({ onClose, onSelect, title = 'Select Media' }: MediaModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('library');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchMedia() {
    try {
      setLoading(true);
      const listRef = ref(storage, 'media');
      const res = await listAll(listRef);
      
      const loadedFiles: MediaFile[] = [];
      for (const itemRef of res.items) {
        const url = await getDownloadURL(itemRef);
        loadedFiles.push({
          name: itemRef.name,
          url,
          path: itemRef.fullPath
        });
      }
      
      loadedFiles.sort((a, b) => b.name.localeCompare(a.name));
      setFiles(loadedFiles);
    } catch (err) {
      console.error('Failed to load media', err);
      setError('Failed to load media.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMedia();
  }, []);

  // ── WebP Conversion ────────────────────────────────────────────────
  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context failed'));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas toBlob failed'));
            },
            'image/webp',
            0.8
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  // ── Upload Handler ─────────────────────────────────────────────────
  async function processUpload(rawFile: File) {
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadedUrl(null);

      let fileToUpload: File | Blob = rawFile;
      let fileExtension = rawFile.name.split('.').pop()?.toLowerCase();
      let isWebPConverted = false;

      if (rawFile.type.startsWith('image/') && fileExtension !== 'webp') {
        try {
          fileToUpload = await convertToWebP(rawFile);
          fileExtension = 'webp';
          isWebPConverted = true;
        } catch (err) {
          console.warn('WebP conversion failed, using original', err);
        }
      }

      const originalName = rawFile.name.replace(/\.[^/.]+$/, "");
      const safeName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const uuidStr = uuidv4().substring(0, 8);
      const fileName = `${safeName}_${uuidStr}.${fileExtension}`;

      const storageRef = ref(storage, `media/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
        contentType: isWebPConverted ? 'image/webp' : rawFile.type,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload failed", error);
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(storageRef);
          setUploadedUrl(url);
          setUploadedName(fileName);
          setUploading(false);
          setUploadProgress(0);
          // Also refresh the library list in the background
          fetchMedia();
        }
      );
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processUpload(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUpload(e.dataTransfer.files[0]);
    }
  }

  function handleUseImage() {
    if (uploadedUrl) {
      onSelect(uploadedUrl);
    }
  }

  function resetUpload() {
    setUploadedUrl(null);
    setUploadedName('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'library' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('library')}
            >
              📁 Library
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'upload' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              ⬆️ Upload
            </button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.content}>
          {/* ─── Library Tab ─── */}
          {activeTab === 'library' && (
            <>
              {loading ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner}></div>
                </div>
              ) : error ? (
                <div className={styles.emptyState}>{error}</div>
              ) : files.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No images in your library yet.</p>
                  <button
                    className={styles.emptyUploadBtn}
                    onClick={() => setActiveTab('upload')}
                  >
                    ⬆️ Upload Your First Image
                  </button>
                </div>
              ) : (
                <div className={styles.gallery}>
                  {files.map((file) => (
                    <div 
                      key={file.path} 
                      className={styles.imageCard}
                      onClick={() => onSelect(file.url)}
                    >
                      <div className={styles.imageThumbnailWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.url} alt={file.name} className={styles.imageThumbnail} loading="lazy" />
                        <div className={styles.imageOverlay}>
                          <span className={styles.selectText}>Select</span>
                        </div>
                      </div>
                      <div className={styles.imageInfo}>
                        <p className={styles.imageName} title={file.name}>{file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── Upload Tab ─── */}
          {activeTab === 'upload' && (
            <div className={styles.uploadArea}>
              {!uploadedUrl && !uploading && (
                <div
                  className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <div className={styles.dropZoneIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className={styles.dropZoneTitle}>Drag & drop an image here</p>
                  <p className={styles.dropZoneSub}>or <strong>click to browse</strong> your files</p>
                  <span className={styles.dropZoneHint}>Images are auto-converted to optimized WebP</span>
                </div>
              )}

              {uploading && (
                <div className={styles.uploadingState}>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className={styles.uploadingText}>
                    Converting & uploading… {uploadProgress}%
                  </p>
                </div>
              )}

              {uploadedUrl && (
                <div className={styles.uploadSuccess}>
                  <div className={styles.uploadPreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadedUrl} alt="Uploaded" className={styles.uploadPreviewImg} />
                  </div>
                  <div className={styles.uploadSuccessInfo}>
                    <div className={styles.uploadSuccessBadge}>✓ Saved to Media Library</div>
                    <p className={styles.uploadSuccessName}>{uploadedName}</p>
                    <div className={styles.uploadSuccessActions}>
                      <button className={styles.useImageBtn} onClick={handleUseImage}>
                        🖼️ Use This Image
                      </button>
                      <button className={styles.uploadAnotherBtn} onClick={resetUpload}>
                        Upload Another
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
