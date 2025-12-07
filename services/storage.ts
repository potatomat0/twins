import supabase from './supabase';

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

export async function uploadAvatar(userId: string, uri: string, mimeType?: string) {
  const response = await fetch(uri);
  // React Native fetch may not expose .blob in all environments; use arrayBuffer as a fallback.
  const arrayBuffer = await response.arrayBuffer();
  const contentType = mimeType || (response.headers.get('Content-Type') ?? 'image/jpeg');
  const ext = extensionFromMime(contentType);
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
