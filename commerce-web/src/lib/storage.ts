/**
 * Supabase Storage Utility - Signed URLs
 * 
 * WHY: Secure file uploads/downloads using time-limited signed URLs
 * 
 * Problem Without Signed URLs:
 * - Anyone with file URL can access/download it
 * - No expiration → URLs work forever
 * - No permission check → public access to private files
 * 
 * Solution With Signed URLs:
 * 1. Check user permissions first
 * 2. Generate time-limited URL (expires in 1 hour)
 * 3. User can only access during valid time window
 * 4. After expiration → URL stops working
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const bucketName = process.env.SUPABASE_BUCKET || 'uploads';

// Create Supabase client (server-side only)
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * File type allowlist
 * WHY: Prevent malicious file uploads (no .exe, .js, etc.)
 */
const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Generate signed upload URL
 * 
 * WHY: User uploads directly to Supabase (doesn't go through your server)
 * Benefits: Faster uploads, less server load, better for large files
 * 
 * @param fileName - Name of file to upload
 * @param fileType - MIME type (e.g., 'image/jpeg')
 * @param userId - User ID (for permission check)
 * @param isAdmin - Is user admin?
 * @returns Signed upload URL and file path
 */
export async function generateUploadUrl(
  fileName: string,
  fileType: string,
  userId: string,
  isAdmin: boolean
): Promise<{ uploadUrl: string; filePath: string; expiresAt: Date } | { error: string }> {
  // Permission check - only admins can upload
  if (!isAdmin) {
    return { error: 'Unauthorized: Admin access required' };
  }

  // File type validation
  if (!ALLOWED_FILE_TYPES.all.includes(fileType)) {
    return { error: `File type not allowed: ${fileType}` };
  }

  // Generate unique file path
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `uploads/${userId}/${timestamp}-${sanitizedFileName}`;

  // Generate signed URL (valid for 1 hour)
  const expiresIn = 60 * 60; // 1 hour in seconds
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(filePath);

  if (error) {
    console.error('Supabase upload URL error:', error);
    return { error: 'Failed to generate upload URL' };
  }

  return {
    uploadUrl: data.signedUrl,
    filePath,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Generate signed download URL
 * 
 * WHY: Time-limited access to files (URL expires after 1 hour)
 * Benefits: Can't share URL permanently, better security
 * 
 * @param filePath - Path to file in Supabase
 * @param userId - User ID (for permission check)
 * @param isAdmin - Is user admin?
 * @returns Signed download URL
 */
export async function generateDownloadUrl(
  filePath: string,
  userId: string,
  isAdmin: boolean
): Promise<{ downloadUrl: string; expiresAt: Date } | { error: string }> {
  // Permission check
  // Admin can access all files
  // Regular users can only access their own files
  if (!isAdmin && !filePath.includes(`/${userId}/`)) {
    return { error: 'Unauthorized: Cannot access this file' };
  }

  // Generate signed URL (valid for 1 hour)
  const expiresIn = 60 * 60; // 1 hour
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Supabase download URL error:', error);
    return { error: 'Failed to generate download URL' };
  }

  return {
    downloadUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Delete file from storage
 * 
 * @param filePath - Path to file
 * @param userId - User ID
 * @param isAdmin - Is user admin?
 */
export async function deleteFile(
  filePath: string,
  userId: string,
  isAdmin: boolean
): Promise<{ success: boolean; error?: string }> {
  // Permission check
  if (!isAdmin && !filePath.includes(`/${userId}/`)) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    console.error('Delete file error:', error);
    return { success: false, error: 'Failed to delete file' };
  }

  return { success: true };
}

/**
 * List user's files
 * 
 * @param userId - User ID
 * @param isAdmin - Is user admin?
 */
export async function listFiles(
  userId: string,
  isAdmin: boolean
): Promise<{ files: any[]; error?: string }> {
  const prefix = isAdmin ? 'uploads/' : `uploads/${userId}/`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(prefix, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('List files error:', error);
    return { files: [], error: 'Failed to list files' };
  }

  return { files: data || [] };
}

/**
 * Validate file before upload
 * 
 * @param fileType - MIME type
 * @param fileSize - Size in bytes
 */
export function validateFile(
  fileType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.all.includes(fileType)) {
    return { valid: false, error: `File type not allowed: ${fileType}` };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB (max 10MB)`,
    };
  }

  return { valid: true };
}
