import supabase from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';

export const USER_UPLOAD_BUCKET = 'user-upload';

export const placeholderAvatarUrl =
  supabase.storage.from(USER_UPLOAD_BUCKET).getPublicUrl('placeHolderUserImage.png').data.publicUrl;

function extensionFromMime(mime?: string) {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('jpg')) return 'jpg';
  return 'jpg';
}

export function getOptimizedImageUrl(url: string | null | undefined, width: number, height?: number) {
  if (!url) return placeholderAvatarUrl;
  if (!url.includes(USER_UPLOAD_BUCKET)) return url; // External URL or placeholder
  
  // If Supabase Image Transformations are enabled (Pro/Team), we can append query params.
  // Standard format: /render/image/public/bucket/path?width=...
  // However, default getPublicUrl returns /object/public/...
  // We'll attempt to construct the render URL if it follows the standard pattern.
  // If the project is on Free tier, these params are ignored and the full image is served (safe fallback).
  
  // Replace /object/public/ with /render/image/public/ if we want to force transformation endpoint
  // BUT: The domain might differ. Safest is to append params and hope the project has it enabled,
  // or just use the resized upload.
  
  // Strategy: We rely on client-side resize (max 1080p) for storage efficiency.
  // For thumbnail retrieval, we append ?width=... which works if Image Transformations are active.
  return `${url}?width=${width}&height=${height ?? width}&resize=cover`;
}

export async function uploadAvatar(userId: string, uri: string, mimeType?: string) {
  // Resize/Compress before upload to save bandwidth and storage
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }], // Max width 1080px is plenty for avatars
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  const response = await fetch(manipResult.uri);
  // React Native fetch may not expose .blob in all environments; use arrayBuffer as a fallback.
  const arrayBuffer = await response.arrayBuffer();
  const contentType = 'image/jpeg'; // Always JPEG after manipulation
  const ext = 'jpg';
  const path = `avatars/${userId}-${Date.now()}.${ext}`;

  console.log('[storage] uploading avatar', { path, contentType, size: arrayBuffer.byteLength });

  const { error } = await supabase.storage.from(USER_UPLOAD_BUCKET).upload(path, arrayBuffer, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  });
  if (error) {
    console.warn('[storage] avatar upload failed', error);
    throw error;
  }

  const { data } = supabase.storage.from(USER_UPLOAD_BUCKET).getPublicUrl(path);
  console.log('[storage] avatar uploaded', { publicUrl: data.publicUrl });
  return { path, publicUrl: data.publicUrl };
}
