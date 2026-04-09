'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import styles from './MediaModal.module.css';

const BUCKET = 'media';
const PAGE_SIZE = 30;

interface MediaFile {
  name: string;
  url: string;
}

interface MediaModalProps {
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}

type Tab = 'library' | 'upload';

function getCleanName(rawName: string) {
  let name = rawName.replace(/\.[^/.]+$/, '');
  name = name.replace(/^\d+_/, '');
  name = name.replace(/_[a-f0-9]{8}$/i, '');
  return name.replace(/_/g, ' ');
}

function guessContentType(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif', avif: 'image/avif',
  };
  return types[ext || ''] || 'application/octet-stream';
}

export default function MediaModal({ onClose, onSelect, title = 'Select Media' }: MediaModalProps) {
  const [allFiles, setAllFiles]       = useState<MediaFile[]>([]);
  const [filteredFiles, setFiltered]  = useState<MediaFile[]>([]);
  const [displayed, setDisplayed]     = useState<MediaFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>('library');

  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl]     = useState<string | null>(null);
  const [uploadedName, setUploadedName]   = useState('');
  const [dragOver, setDragOver]           = useState(false);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchMedia() {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'desc' },
      });
      if (error) throw error;

      const files: MediaFile[] = (data || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
        }));

      setAllFiles(files);
      setFiltered(files);
      setDisplayed(files.slice(0, PAGE_SIZE));
    } catch (err) {
      console.error('Failed to load media:', err);
      setError('Failed to load media.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMedia(); }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const trimmed = val.trim();
      let newFiles = allFiles;
      if (trimmed.length >= 3) {
        const terms = trimmed.toLowerCase().split(/\s+/);
        newFiles = allFiles.filter(f =>
          terms.every(t => getCleanName(f.name).toLowerCase().includes(t))
        );
      }
      setFiltered(newFiles);
      setDisplayed(newFiles.slice(0, PAGE_SIZE));
    }, 300);
  };

  const loadMore = () => {
    setLoadingMore(true);
    const next = filteredFiles.slice(displayed.length, displayed.length + PAGE_SIZE);
    setDisplayed(prev => [...prev, ...next]);
    setLoadingMore(false);
  };

  const convertToWebP = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > 800 || h > 800) {
            if (w > h) { h = Math.round((h * 800) / w); w = 800; }
            else { w = Math.round((w * 800) / h); h = 800; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context failed'));
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/webp', 0.8);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });

  async function processUpload(rawFile: File) {
    try {
      setUploading(true);
      setUploadProgress(10);
      setUploadedUrl(null);

      let blob: Blob = rawFile;
      let ext = rawFile.name.split('.').pop()?.toLowerCase() || 'jpg';

      if (rawFile.type.startsWith('image/') && ext !== 'webp') {
        try { blob = await convertToWebP(rawFile); ext = 'webp'; }
        catch { /* fall back to original */ }
      }

      setUploadProgress(40);

      const baseName = rawFile.name.replace(/\.[^/.]+$/, '');
      const safeName = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${safeName}_${uuidv4().substring(0, 8)}.${ext}`;

      const arrayBuffer = await blob.arrayBuffer();
      const uint8       = new Uint8Array(arrayBuffer);

      setUploadProgress(70);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, uint8, { contentType: guessContentType(fileName), upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      setUploadedUrl(urlData.publicUrl);
      setUploadedName(fileName);
      setUploadProgress(100);
      fetchMedia();
    } catch (err) {
      console.error(err);
      setError('Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) processUpload(e.target.files[0]);
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
            <button className={`${styles.tab} ${activeTab === 'library' ? styles.tabActive : ''}`} onClick={() => setActiveTab('library')}>
              📁 Library
            </button>
            <button className={`${styles.tab} ${activeTab === 'upload' ? styles.tabActive : ''}`} onClick={() => setActiveTab('upload')}>
              ⬆️ Upload
            </button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {/* ─── Library Tab ─── */}
          {activeTab === 'library' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Search images (min 3 chars)..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{ width: '100%', padding: '0.65rem 1rem', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '0.95rem' }}
                />
              </div>

              {loading ? (
                <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
              ) : error ? (
                <div className={styles.emptyState}>{error}</div>
              ) : displayed.length === 0 ? (
                <div className={styles.emptyState}>
                  {searchQuery.length >= 3
                    ? <p>No images found matching &quot;{searchQuery}&quot;</p>
                    : <><p>No images in your library yet.</p><button className={styles.emptyUploadBtn} onClick={() => setActiveTab('upload')}>⬆️ Upload Your First Image</button></>
                  }
                </div>
              ) : (
                <div className={styles.gallery}>
                  {displayed.map(file => (
                    <div key={file.name} className={styles.imageCard} onClick={() => onSelect(file.url)}>
                      <div className={styles.imageThumbnailWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.url} alt={file.name} className={styles.imageThumbnail} loading="lazy" />
                        <div className={styles.imageOverlay}><span className={styles.selectText}>Select</span></div>
                      </div>
                      <div className={styles.imageInfo}>
                        <p className={styles.imageName} title={getCleanName(file.name)}>{getCleanName(file.name)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !error && displayed.length < filteredFiles.length && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1rem' }}>
                  <button className={styles.uploadAnotherBtn} style={{ padding: '0.6rem 1.25rem', cursor: 'pointer' }} onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load More Images'}
                  </button>
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
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
                  onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) processUpload(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} />
                  <div className={styles.dropZoneIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className={styles.dropZoneTitle}>Drag &amp; drop an image here</p>
                  <p className={styles.dropZoneSub}>or <strong>click to browse</strong> your files</p>
                  <span className={styles.dropZoneHint}>Auto-converted to WebP · max 800px</span>
                </div>
              )}

              {uploading && (
                <div className={styles.uploadingState}>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className={styles.uploadingText}>Converting &amp; uploading… {uploadProgress}%</p>
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
                    <p className={styles.uploadSuccessName}>{getCleanName(uploadedName)}</p>
                    <div className={styles.uploadSuccessActions}>
                      <button className={styles.useImageBtn} onClick={() => onSelect(uploadedUrl)}>🖼️ Use This Image</button>
                      <button className={styles.uploadAnotherBtn} onClick={resetUpload}>Upload Another</button>
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
