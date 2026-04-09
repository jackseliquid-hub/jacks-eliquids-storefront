'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import styles from '../admin.module.css';
import mediaStyles from './media.module.css';

const BUCKET = 'media';
const PAGE_SIZE = 30;

interface MediaFile {
  name: string;
  url: string;
}

// Clean internal filename to human readable format
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

export default function MediaLibraryPage() {
  const [allFiles, setAllFiles]       = useState<MediaFile[]>([]);
  const [filteredFiles, setFiltered]  = useState<MediaFile[]>([]);
  const [displayed, setDisplayed]     = useState<MediaFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toastMessage, setToastMessage]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadImages = async () => {
    try {
      setLoading(true);
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
      console.error('Error loading media:', err);
      showToast('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadImages(); }, []);

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

  const processUpload = async (rawFile: File) => {
    try {
      setUploading(true);
      setUploadProgress(10);

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

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, uint8, { contentType: guessContentType(fileName), upsert: false });

      if (error) throw error;

      setUploadProgress(100);
      showToast('Image uploaded successfully!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadImages();
    } catch (err) {
      console.error(err);
      showToast('Upload failed. See console.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processUpload(e.target.files[0]);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Copied URL to clipboard');
  };

  const deleteImage = async (fileName: string) => {
    if (!window.confirm('Delete this image permanently?')) return;
    const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
    if (error) { showToast('Failed to delete image'); return; }
    setAllFiles(prev => prev.filter(f => f.name !== fileName));
    setFiltered(prev => prev.filter(f => f.name !== fileName));
    setDisplayed(prev => prev.filter(f => f.name !== fileName));
    showToast('Image deleted');
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Media Library</h1>
          <p className={styles.pageSubtitle}>
            {filteredFiles.length} items {searchQuery.length >= 3 ? 'found' : 'uploaded'}
          </p>
        </div>
      </div>

      <div className={styles.sections}>
        {/* Search */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <input
            type="text"
            placeholder="Search images (min 3 chars)..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles.input}
            style={{ maxWidth: '300px' }}
          />
        </div>

        {/* Upload Zone */}
        <div
          className={mediaStyles.dropZone}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) processUpload(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
          {uploading ? (
            <div className={mediaStyles.uploadingState}>
              <div className={mediaStyles.progressTrack}>
                <div className={mediaStyles.progressBar} style={{ width: `${uploadProgress}%` }} />
              </div>
              <p>Uploading... converting to WebP ({uploadProgress}%)</p>
            </div>
          ) : (
            <div className={mediaStyles.idleState}>
              <div className={mediaStyles.uploadIcon}>⬆️</div>
              <p><strong>Click to browse</strong> or drag &amp; drop an image here</p>
              <span className={mediaStyles.subText}>Images auto-converted to optimised WebP · max 800px</span>
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        <div className={mediaStyles.galleryGrid}>
          {loading ? (
            <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
          ) : displayed.length === 0 ? (
            <div className={mediaStyles.emptyState}>No images uploaded yet.</div>
          ) : (
            displayed.map(file => (
              <div key={file.name} className={mediaStyles.imageCard}>
                <div className={mediaStyles.imageThumbnailWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.url} alt={file.name} className={mediaStyles.imageThumbnail} loading="lazy" />
                  <div className={mediaStyles.imageOverlay}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary} ${mediaStyles.overlayBtn}`}
                      onClick={e => { e.stopPropagation(); copyUrl(file.url); }}
                    >🔗 Copy URL</button>
                    <button
                      className={`${styles.btn} ${styles.btnDanger} ${mediaStyles.overlayBtn}`}
                      onClick={e => { e.stopPropagation(); deleteImage(file.name); }}
                    >🗑️ Delete</button>
                  </div>
                </div>
                <div className={mediaStyles.imageInfo}>
                  <p className={mediaStyles.imageName} title={getCleanName(file.name)}>{getCleanName(file.name)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && displayed.length < filteredFiles.length && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load More Images'}
            </button>
          </div>
        )}
      </div>

      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}
