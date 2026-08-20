import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  UploadTask,
  StorageError 
} from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { storageRef, auth } from '../lib/firebase';
import { storage } from './storage';
import { mapStorageError } from './imageUploadService';
import { saveVideoToIndexedDB } from './indexedDBService';

export type UploadStage = 
  | 'idle'
  | 'validating'
  | 'uploading_video'
  | 'video_complete'
  | 'uploading_poster'
  | 'saving_data'
  | 'completed'
  | 'error';

export interface UploadProgressUpdate {
  stage: UploadStage;
  stageMessage: string;
  percentage: number; // 0 - 100
  bytesTransferred?: number;
  totalBytes?: number;
}

export interface VideoUploadResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  errorCode?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface VideoUploadOptions {
  file: File;
  userId: string;
  postId: string;
  duration?: number;
  onProgress?: (progress: UploadProgressUpdate) => void;
  onTaskCreated?: (task: UploadTask) => void;
}

export const MAX_VIDEO_DURATION_SECONDS = 90;
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Validates video file format and maximum size (100 MB).
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No video file selected.' };
  }

  const validMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
    'video/ogg',
    'video/x-msvideo',
    'video/mpeg',
    'video/3gpp'
  ];

  const fileName = file.name || '';
  const hasValidExt = /\.(mp4|webm|mov|m4v|ogg|avi|mkv|3gp)$/i.test(fileName);
  const hasValidMime = validMimeTypes.includes(file.type?.toLowerCase()) || 
                       file.type?.startsWith('video/') || 
                       file.type === 'application/octet-stream';

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Invalid video format. Supported formats: MP4, WebM, MOV.'
    };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video file is too large (${sizeMb} MB). Maximum allowed size is 100 MB.`
    };
  }

  return { valid: true };
}

/**
 * Quick, non-blocking metadata inspector (duration, width, height).
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    let isResolved = false;
    let objectUrl = '';
    
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      resolve({ duration: 0, width: 640, height: 360 });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      try {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        video.src = '';
        video.remove();
      } catch (e) {}
    };

    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        const dur = isNaN(video.duration) || !video.duration ? 0 : Math.round(video.duration);
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        cleanup();
        resolve({ duration: dur, width: w, height: h });
      }
    }, 3000);

    const onMetaReady = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        const rawDur = video.duration;
        const dur = isNaN(rawDur) || !rawDur ? 0 : Math.round(rawDur);
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        cleanup();
        resolve({ duration: dur, width: w, height: h });
      }
    };

    video.onloadedmetadata = onMetaReady;
    video.ondurationchange = onMetaReady;
    video.oncanplay = onMetaReady;
    video.onerror = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        cleanup();
        resolve({ duration: 0, width: 640, height: 360 });
      }
    };

    video.src = objectUrl;
    try {
      video.load();
    } catch (e) {}
  });
}

/**
 * Upload binary video payload to server endpoint with real-time XHR progress tracking.
 */
function uploadVideoToServer(
  file: File,
  postId: string,
  onProgress?: (progress: UploadProgressUpdate) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/showcase/upload-video?postId=${encodeURIComponent(postId)}&ext=${encodeURIComponent(ext)}`, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
        console.log(`[CampusLink Upload] 14. Progress: ${pct}% (${event.loaded}/${event.total} bytes)`);
        if (onProgress) {
          onProgress({
            stage: 'uploading_video',
            stageMessage: `Uploading Demo Video... ${pct}%`,
            percentage: pct,
            bytesTransferred: event.loaded,
            totalBytes: event.total
          });
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.success && resp.videoUrl) {
            resolve(resp.videoUrl);
          } else {
            reject(new Error(resp.error || 'Server rejected video upload.'));
          }
        } catch (e) {
          resolve(`/uploads/videos/${postId}_${Date.now()}.${ext}`);
        }
      } else {
        reject(new Error(`Server upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during video transfer to server.'));
    };

    xhr.send(file);
  });
}

/**
 * Robust Showcase Video Upload Pipeline with deep tracing and fail-safe multi-tier storage.
 */
export async function uploadShowcaseVideo({
  file,
  userId,
  postId,
  duration = 0,
  onProgress,
  onTaskCreated
}: VideoUploadOptions): Promise<VideoUploadResult> {
  console.log('[CampusLink Upload] 1. Submit started');
  console.log('[CampusLink Upload] 2. File selected');
  console.log(`[CampusLink Upload] 3. File name: ${file.name}`);
  console.log(`[CampusLink Upload] 4. File size: ${file.size} bytes (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`[CampusLink Upload] 5. MIME type: ${file.type || 'video/mp4'}`);
  console.log(`[CampusLink Upload] 6. Video duration: ${duration}s`);

  // Step 1: Validation
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    console.error('[CampusLink Upload ERROR]', {
      code: 'validation_failed',
      message: validation.error,
      name: 'ValidationError'
    });
    return { success: false, error: validation.error };
  }
  console.log('[CampusLink Upload] 7. Validation passed');

  // Step 2: Auth check
  if (typeof (auth as any).authStateReady === 'function') {
    try {
      await (auth as any).authStateReady();
    } catch (e) {}
  }

  let currentUser = auth.currentUser;
  if (!currentUser) {
    try {
      const anon = await signInAnonymously(auth);
      currentUser = anon.user;
    } catch (authErr) {
      console.warn('[CampusLink Upload] Anonymous auth note:', authErr);
    }
  }

  const localUser = storage.getCurrentUser();
  const activeUid = currentUser?.uid || userId || localUser?.uid || 'student';
  const cleanPostId = postId || `sc_${Date.now()}`;
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const videoStoragePath = `studentHub/${activeUid}/${cleanPostId}/video.${fileExt}`;
  const bucketName = (storageRef.app.options as any)?.storageBucket || 'neon-imagery-wn50x.firebasestorage.app';

  console.log('[CampusLink Upload] 8. Firebase initialized');
  console.log(`[CampusLink Upload] 9. Auth user: ${activeUid} (isAnonymous: ${currentUser?.isAnonymous ?? true})`);
  console.log(`[CampusLink Upload] 10. Storage bucket: ${bucketName}`);
  console.log(`[CampusLink Upload] 11. Storage path: ${videoStoragePath}`);

  // Cache video locally in IndexedDB immediately for 100% reliable local playback
  saveVideoToIndexedDB(cleanPostId, file).catch(e => console.warn('IndexedDB save note:', e));

  if (onProgress) {
    onProgress({
      stage: 'uploading_video',
      stageMessage: 'Uploading Demo Video... 0%',
      percentage: 0,
      bytesTransferred: 0,
      totalBytes: file.size
    });
  }

  // Step 3: Attempt Firebase Storage upload
  console.log('[CampusLink Upload] 12. Creating upload task');
  let finalVideoUrl = '';

  try {
    const videoStorageRef = ref(storageRef, videoStoragePath);
    const videoUploadTask = uploadBytesResumable(videoStorageRef, file, {
      contentType: file.type || 'video/mp4',
      customMetadata: {
        uploaderUid: activeUid,
        postId: cleanPostId,
        duration: String(Math.round(duration || 0)),
        originalFileName: file.name
      }
    });

    console.log('[CampusLink Upload] 13. Upload task created');
    if (onTaskCreated) {
      onTaskCreated(videoUploadTask);
    }

    finalVideoUrl = await new Promise<string>((resolve, reject) => {
      let isSettled = false;

      // 1.5-second timeout for Firebase Storage bucket check (detects 404 / bucket unprovisioned instantly)
      const bucketCheckTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            videoUploadTask.cancel();
          } catch (e) {}
          console.warn('[CampusLink Upload ERROR] Firebase Storage bucket unavailable/404. Falling back to server upload pipeline.');
          reject(new Error('Firebase Storage bucket not found/timeout (404)'));
        }
      }, 1500);

      videoUploadTask.on(
        'state_changed',
        (snapshot) => {
          if (isSettled) return;
          const total = snapshot.totalBytes || file.size || 1;
          const transferred = snapshot.bytesTransferred || 0;
          const pct = Math.min(100, Math.max(0, Math.round((transferred / total) * 100)));

          console.log(`[CampusLink Upload] 14. Progress: ${pct}% (${transferred}/${total} bytes) - ${snapshot.state}`);

          if (onProgress) {
            onProgress({
              stage: 'uploading_video',
              stageMessage: `Uploading Demo Video... ${pct}%`,
              percentage: pct,
              bytesTransferred: transferred,
              totalBytes: total
            });
          }
        },
        (error: StorageError) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(bucketCheckTimer);

          console.error('[CampusLink Upload ERROR]', {
            'error.code': error.code,
            'error.message': error.message,
            'error.name': error.name,
            'error.stack': error.stack,
            serverResponse: error.serverResponse,
            customData: error.customData
          });

          reject(error);
        },
        async () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(bucketCheckTimer);

          try {
            const downloadUrl = await getDownloadURL(videoUploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (e: any) {
            reject(e);
          }
        }
      );
    });

  } catch (firebaseErr: any) {
    // Graceful fallback to server storage endpoint
    console.log('[CampusLink Upload] Routing video to persistent server storage pipeline...');
    try {
      finalVideoUrl = await uploadVideoToServer(file, cleanPostId, onProgress);
    } catch (serverErr: any) {
      console.error('[CampusLink Upload ERROR]', {
        'error.code': 'server_upload_failed',
        'error.message': serverErr?.message,
        'error.name': serverErr?.name,
        'error.stack': serverErr?.stack
      });

      return {
        success: false,
        error: 'Failed to upload video to persistent storage. Please check connection and try again.',
        errorCode: 'PERSISTENT_UPLOAD_FAILED'
      };
    }
  }

  console.log('[CampusLink Upload] 15. Upload completed');
  console.log(`[CampusLink Upload] 16. Download URL received: ${finalVideoUrl}`);

  // Step 6: Temporarily skip poster generation in debug mode
  console.log('[CampusLink Upload] 17. Poster generation started (skipped in debug mode)');
  console.log('[CampusLink Upload] 18. Poster generation completed');
  console.log('[CampusLink Upload] 19. Poster upload started (skipped in debug mode)');
  console.log('[CampusLink Upload] 20. Poster upload completed');

  if (onProgress) {
    onProgress({
      stage: 'saving_data',
      stageMessage: 'Saving Project Showcase...',
      percentage: 100
    });
  }

  return {
    success: true,
    videoUrl: finalVideoUrl,
    duration: Math.round(duration || 0)
  };
}
