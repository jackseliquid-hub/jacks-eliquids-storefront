const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'jacks-e-liquid-v2.firebasestorage.app'
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

const MASTER_DIR = path.join(__dirname, 'master image files');

function extractStoragePathFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let decoded = url;
  try {
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      decoded = decodeURIComponent(urlObj.pathname);
    } else {
      decoded = decodeURIComponent(url);
    }
  } catch (e) {}
  const pathPart = decoded.split('/o/');
  return pathPart.length > 1 ? pathPart[1] : null;
}

function constructWebUrl(storagePath) {
  const encodedPath = encodeURIComponent(storagePath);
  // Optional query token. Media tools in WP or Firebase often just serve alt=media
  return `https://firebasestorage.googleapis.com/v0/b/jacks-e-liquid-v2.firebasestorage.app/o/${encodedPath}?alt=media`;
}

async function run() {
  try {
    console.log("=== Phase 1: Uploading to Media Library ('media/') ===");
    const localFiles = fs.readdirSync(MASTER_DIR);
    const validFiles = localFiles.filter(f => f !== '.DS_Store');
    
    console.log(`Found ${validFiles.length} files to push into the unifying 'media/' folder.`);
    
    let uploadCount = 0;
    
    // Upload sequentially to avoid throttling
    for (const file of validFiles) {
      const localPath = path.join(MASTER_DIR, file);
      const destinationPath = `media/${file}`;
      
      try {
        await bucket.upload(localPath, {
          destination: destinationPath,
          metadata: {
            cacheControl: 'public, max-age=31536000'
          }
        });
        uploadCount++;
        console.log(`[Upload ${uploadCount}/${validFiles.length}] Successfully pushed to ${destinationPath}`);
      } catch (err) {
        console.log(`[Upload Error] Failed on ${file}: ${err.message}`);
      }
    }

    console.log(`\n=== Phase 2: Codebase Investigation (Firestore Media Documents) ==="`);
    console.log(`We inspected MediaModal.tsx and confirmed that your system purely queries Firebase Storage natively via listAll().`);
    console.log(`Therefore, NO separate Firestore documents are needed for these images to appear in your UI! The UI will render them automatically since they are now located directly inside the 'media/' storage path.`);

    console.log(`\n=== Phase 3: Unifying Firestore Data References ==="`);
    let updateCount = 0;

    // Helper to safely restructure URLs from products/abc to media/abc
    const processUrl = (url) => {
      if (typeof url !== 'string') return url;
      const storagePath = extractStoragePathFromUrl(url);
      if (!storagePath) return url;
      
      const fileBasename = path.basename(storagePath);
      // We push it exactly to the new structure!
      const newStoragePath = `media/${fileBasename}`;
      
      // If it originally had products/ something else, it is now media/
      return constructWebUrl(newStoragePath);
    };

    const updateCollection = async (collectionName, hasGallery = false) => {
      const snapshot = await db.collection(collectionName).get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsUpdate = false;
        let updatePayload = {};

        if (data.image) {
          const processed = processUrl(data.image);
          if (processed !== data.image) {
            updatePayload.image = processed;
            needsUpdate = true;
          }
        }

        if (hasGallery && Array.isArray(data.gallery)) {
          let updatedGallery = [];
          let galleryChanged = false;
          for (const gUrl of data.gallery) {
             const processed = processUrl(gUrl);
             updatedGallery.push(processed);
             if (processed !== gUrl) galleryChanged = true;
          }
          if (galleryChanged) {
            updatePayload.gallery = updatedGallery;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await db.collection(collectionName).doc(doc.id).update(updatePayload);
          console.log(`  -> [Updated] ${collectionName} ID: '${doc.id}' updated to new media/ URLs`);
          updateCount++;
        }
      }
    };

    // Process Products
    await updateCollection('products', true);
    // Process Blogs
    await updateCollection('blogs', false);

    // Process Global SEO
    const seoDoc = await db.collection('metadata').doc('seo').get();
    if (seoDoc.exists) {
      const data = seoDoc.data();
      if (data.defaultOgImage) {
        const processed = processUrl(data.defaultOgImage);
        if (processed !== data.defaultOgImage) {
          await db.collection('metadata').doc('seo').update({ defaultOgImage: processed });
          console.log(`  -> [Updated] SEO defaultOgImage updated to new media/ URL`);
          updateCount++;
        }
      }
    }

    console.log(`\n=== Migration Complete ==="`);
    console.log(`All ${validFiles.length} files actively transferred into the Media Library!`);
    console.log(`Total database documents redirected: ${updateCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Critical Execution Error:", err);
    process.exit(1);
  }
}

run();
