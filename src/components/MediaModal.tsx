'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
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

export default function MediaModal({ onClose, onSelect, title = 'Select Media' }: MediaModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
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
        
        // Sort newest first based on the timestamp prefix we used in the uploader
        loadedFiles.sort((a, b) => b.name.localeCompare(a.name));
        setFiles(loadedFiles);
      } catch (err) {
        console.error('Failed to load media', err);
        setError('Failed to load media.');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner}></div>
            </div>
          ) : error ? (
            <div className={styles.emptyState}>{error}</div>
          ) : files.length === 0 ? (
            <div className={styles.emptyState}>No images uploaded yet. Upload some in the Media Library.</div>
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
        </div>
      </div>
    </div>
  );
}
