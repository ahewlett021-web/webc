import * as path from 'path';
import * as fs from 'fs';
import { URL } from 'url';
import mime from 'mime-types';
import { AssetType } from './types';

/**
 * Normalize a URL to ensure it's absolute
 */
export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      const base = new URL(baseUrl);
      return `${base.protocol}${url}`;
    }

    // Handle absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Handle relative URLs
    const resolved = new URL(url, baseUrl);
    return resolved.href;
  } catch (error) {
    console.warn(`Failed to normalize URL: ${url}`, error);
    return url;
  }
}

/**
 * Get the local file path for a URL
 */
export function getLocalPath(url: string, baseUrl: string, outputDir: string): string {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);

    let relativePath = urlObj.pathname;

    // Remove leading slash
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }

    // Handle empty path (root)
    if (!relativePath || relativePath === '') {
      relativePath = 'index.html';
    }

    // Handle paths ending with /
    if (relativePath.endsWith('/')) {
      relativePath = path.join(relativePath, 'index.html');
    }

    // If no extension, assume it's an HTML page
    if (!path.extname(relativePath)) {
      relativePath = path.join(relativePath, 'index.html');
    }

    // Handle query parameters by creating a unique filename
    if (urlObj.search) {
      const ext = path.extname(relativePath) || '.html';
      const basename = path.basename(relativePath, ext);
      const dirname = path.dirname(relativePath);
      const hash = Buffer.from(urlObj.search).toString('base64').replace(/[/+=]/g, '').substring(0, 8);
      relativePath = path.join(dirname, `${basename}_${hash}${ext}`);
    }

    return path.join(outputDir, relativePath);
  } catch (error) {
    console.warn(`Failed to get local path for URL: ${url}`, error);
    return path.join(outputDir, 'unknown', path.basename(url));
  }
}

/**
 * Determine the asset type from URL and content type
 */
export function getAssetType(url: string, contentType?: string): AssetType {
  const urlLower = url.toLowerCase();
  const mimeType = contentType?.split(';')[0].trim() || mime.lookup(url) || '';

  if (mimeType.includes('text/html') || urlLower.endsWith('.html') || urlLower.endsWith('.htm')) {
    return AssetType.HTML;
  }

  if (mimeType.includes('text/css') || urlLower.endsWith('.css')) {
    return AssetType.CSS;
  }

  if (mimeType.includes('javascript') || mimeType.includes('application/javascript') ||
      urlLower.endsWith('.js') || urlLower.endsWith('.mjs')) {
    return AssetType.JavaScript;
  }

  if (mimeType.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp)$/i.test(urlLower)) {
    return AssetType.Image;
  }

  if (mimeType.includes('font') ||
      /\.(woff|woff2|ttf|eot|otf)$/i.test(urlLower)) {
    return AssetType.Font;
  }

  return AssetType.Other;
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Check if URL belongs to the same domain
 */
export function isSameDomain(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    return urlObj.hostname === baseUrlObj.hostname;
  } catch {
    return false;
  }
}

/**
 * Get relative path from one file to another
 */
export function getRelativePath(from: string, to: string): string {
  const relativePath = path.relative(path.dirname(from), to);
  // Convert Windows backslashes to forward slashes
  return relativePath.replace(/\\/g, '/');
}

/**
 * Clean URL by removing fragments
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hash = '';
    return urlObj.href;
  } catch {
    return url.split('#')[0];
  }
}
