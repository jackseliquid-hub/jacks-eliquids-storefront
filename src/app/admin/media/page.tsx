'use client';

import { useState, useEffect, useRef } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject, StorageReference } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import styles from '../admin.module.css';
import mediaStyles from './media.module.css';

interface MediaFile {
  name: string;
  url: string;
  ref: StorageReference;
}

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all images from Firebase Storage
  const loadImages = async () => {
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
          ref: itemRef
        });
      }
      
      // Basic sort by name (since we prepend timestamps)
      loadedFiles.sort((a, b) => b.name.localeCompare(a.name));
      setFiles(loadedFiles);
    } catch (error) {
      console.error('Error loading media:', error);
      showToast('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Convert File to WebP
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
            0.8 // 80% quality
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    processUpload(fileList[0]);
  };

  const processUpload = async (rawFile: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // 1. Convert to webp if it's an image
      let fileToUpload: File | Blob = rawFile;
      let fileExtension = rawFile.name.split('.').pop()?.toLowerCase();
      let isWebPConverted = false;

      if (rawFile.type.startsWith('image/') && fileExtension !== 'webp') {
        try {
          fileToUpload = await convertToWebP(rawFile);
          fileExtension = 'webp';
          isWebPConverted = true;
        } catch (err) {
          console.warn('WebP conversion failed, using original file', err);
        }
      }

      // 2. Build unique filename
      const originalName = rawFile.name.replace(/\.[^/.]+$/, ""); // Strip extension
      const safeName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      // Prefix with timestamp so they sort newest-first automatically
      const timestamp = Date.now();
      const uuidStr = uuidv4().substring(0, 8);
      const fileName = `${timestamp}_${safeName}_${uuidStr}.${fileExtension}`;

      // 3. Upload to Firebase
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
          showToast('Upload failed. See console.');
          setUploading(false);
        },
        async () => {
          // Success
          setUploading(false);
          setUploadProgress(0);
          showToast('Image uploaded successfully');
          if (fileInputRef.current) fileInputRef.current.value = '';
          await loadImages();
        }
      );
    } catch (err) {
      console.error(err);
      setUploading(false);
      showToast('Error processing upload.');
    }
  };

  // Drag and Drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Copied URL to clipboard');
  };

  const deleteImage = async (fileRef: StorageReference) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this image permanently?');
    if (!confirmDelete) return;

    try {
      await deleteObject(fileRef);
      setFiles(prev => prev.filter(f => f.ref.fullPath !== fileRef.fullPath));
      showToast('Image deleted');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete image');
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Media Library</h1>
          <p className={styles.pageSubtitle}>{files.length} items uploaded</p>
        </div>
      </div>

      <div className={styles.sections}>
        {/* Upload Zone */}
        <div 
          className={mediaStyles.dropZone}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          {uploading ? (
            <div className={mediaStyles.uploadingState}>
              <div className={mediaStyles.progressTrack}>
                <div 
                  className={mediaStyles.progressBar} 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p>Uploading... converting to WebP ({uploadProgress}%)</p>
            </div>
          ) : (
            <div className={mediaStyles.idleState}>
              <div className={mediaStyles.uploadIcon}>⬆️</div>
              <p><strong>Click to browse</strong> or drag &amp; drop an image here</p>
              <span className={mediaStyles.subText}>Images will be automatically converted to highly optimized WebP format</span>
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        <div className={mediaStyles.galleryGrid}>
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner}></div>
            </div>
          ) : files.length === 0 ? (
            <div className={mediaStyles.emptyState}>No images uploaded yet.</div>
          ) : (
            files.map((file) => (
              <div key={file.ref.fullPath} className={mediaStyles.imageCard}>
                <div className={mediaStyles.imageThumbnailWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.url} alt={file.name} className={mediaStyles.imageThumbnail} loading="lazy" />
                  <div className={mediaStyles.imageOverlay}>
                    <button 
                      className={`${styles.btn} ${styles.btnPrimary} ${mediaStyles.overlayBtn}`}
                      onClick={(e) => { e.stopPropagation(); copyUrl(file.url); }}
                      title="Copy URL"
                    >
                      🔗 Copy URL
                    </button>
                    <button 
                      className={`${styles.btn} ${styles.btnDanger} ${mediaStyles.overlayBtn}`}
                      onClick={(e) => { e.stopPropagation(); deleteImage(file.ref); }}
                      title="Delete Image"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                <div className={mediaStyles.imageInfo}>
                  <p className={mediaStyles.imageName} title={file.name}>{file.name}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {toastMessage && (
        <div className={styles.toast}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
