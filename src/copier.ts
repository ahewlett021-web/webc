import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import * as css from 'css';
import {
  CopierOptions,
  DownloadedAsset,
  AssetType,
  ProcessingStats
} from './types';
import {
  normalizeUrl,
  getLocalPath,
  getAssetType,
  ensureDir,
  isSameDomain,
  getRelativePath,
  cleanUrl
} from './utils';

export class WebsiteCopier {
  private options: Required<CopierOptions>;
  private downloadedAssets: Map<string, DownloadedAsset> = new Map();
  private pendingDownloads: Set<string> = new Set();
  private client: AxiosInstance;
  private stats: ProcessingStats;
  private concurrencyQueue: Promise<void>[] = [];

  constructor(options: CopierOptions) {
    this.options = {
      maxDepth: 3,
      followExternalLinks: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      timeout: 30000,
      concurrency: 5,
      ...options
    };

    this.client = axios.create({
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });

    this.stats = {
      totalAssets: 0,
      downloadedAssets: 0,
      failedAssets: 0,
      startTime: Date.now()
    };
  }

  /**
   * Start copying the website
   */
  async copy(): Promise<void> {
    console.log(`Starting download of ${this.options.url}`);
    console.log(`Output directory: ${this.options.outputDir}`);

    ensureDir(this.options.outputDir);

    try {
      await this.downloadAsset(this.options.url, AssetType.HTML, 0);

      // Wait for all pending downloads
      await this.waitForQueue();

      this.stats.endTime = Date.now();
      this.printStats();
    } catch (error) {
      console.error('Error during website copy:', error);
      throw error;
    }
  }

  /**
   * Download an asset and process it
   */
  private async downloadAsset(
    url: string,
    assetType: AssetType,
    depth: number
  ): Promise<void> {
    const cleanedUrl = cleanUrl(url);

    // Skip if already downloaded or pending
    if (this.downloadedAssets.has(cleanedUrl) || this.pendingDownloads.has(cleanedUrl)) {
      return;
    }

    // Skip if depth exceeded
    if (depth > this.options.maxDepth) {
      return;
    }

    // Skip external links if not following
    if (!this.options.followExternalLinks && !isSameDomain(cleanedUrl, this.options.url)) {
      return;
    }

    this.pendingDownloads.add(cleanedUrl);
    this.stats.totalAssets++;

    // Add to concurrency queue and manage concurrency
    const downloadPromise = this.executeDownload(cleanedUrl, assetType, depth)
      .finally(() => {
        // Remove from queue when done
        const index = this.concurrencyQueue.indexOf(downloadPromise);
        if (index > -1) {
          this.concurrencyQueue.splice(index, 1);
        }
      });

    this.concurrencyQueue.push(downloadPromise);

    // Wait if we've reached max concurrency
    if (this.concurrencyQueue.length >= this.options.concurrency) {
      await Promise.race(this.concurrencyQueue);
    }
  }

  /**
   * Execute the actual download
   */
  private async executeDownload(
    url: string,
    assetType: AssetType,
    depth: number
  ): Promise<void> {
    try {
      console.log(`[${this.stats.downloadedAssets + 1}/${this.stats.totalAssets}] Downloading: ${url}`);

      // Adjust headers based on asset type
      const headers: any = {};
      if (assetType === AssetType.CSS) {
        headers['Accept'] = 'text/css,*/*;q=0.1';
        headers['Sec-Fetch-Dest'] = 'style';
      } else if (assetType === AssetType.JavaScript) {
        headers['Accept'] = '*/*';
        headers['Sec-Fetch-Dest'] = 'script';
      } else if (assetType === AssetType.Image) {
        headers['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
        headers['Sec-Fetch-Dest'] = 'image';
      } else if (assetType === AssetType.Font) {
        headers['Accept'] = '*/*';
        headers['Sec-Fetch-Dest'] = 'font';
      }

      const response = await this.client.get(url, {
        responseType: assetType === AssetType.Image || assetType === AssetType.Font ? 'arraybuffer' : 'text',
        headers
      });

      const contentType = response.headers['content-type'];
      const detectedType = getAssetType(url, contentType);
      const localPath = getLocalPath(url, this.options.url, this.options.outputDir);

      // Ensure directory exists
      ensureDir(path.dirname(localPath));

      // Save the asset
      const content = response.data;

      if (detectedType === AssetType.HTML) {
        const processedHtml = await this.processHtml(content, url, depth);
        fs.writeFileSync(localPath, processedHtml, 'utf-8');
      } else if (detectedType === AssetType.CSS) {
        const processedCss = await this.processCss(content, url, depth);
        fs.writeFileSync(localPath, processedCss, 'utf-8');
      } else if (Buffer.isBuffer(content)) {
        fs.writeFileSync(localPath, content);
      } else {
        fs.writeFileSync(localPath, content, 'utf-8');
      }

      this.downloadedAssets.set(url, {
        url,
        localPath,
        type: detectedType
      });

      this.stats.downloadedAssets++;
      this.pendingDownloads.delete(url);
    } catch (error: any) {
      console.error(`Failed to download ${url}:`, error.message);
      this.stats.failedAssets++;
      this.pendingDownloads.delete(url);
    }
  }

  /**
   * Process HTML content and extract assets
   */
  private async processHtml(html: string, baseUrl: string, depth: number): Promise<string> {
    const $ = cheerio.load(html);

    // Track all asset downloads
    const assetDownloads: Promise<void>[] = [];

    // Process images
    $('img[src]').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const absoluteUrl = normalizeUrl(src, baseUrl);
        assetDownloads.push(this.downloadAsset(absoluteUrl, AssetType.Image, depth + 1));
        $(elem).attr('src', this.getRelativeUrl(absoluteUrl, baseUrl));
      }
    });

    // Process srcset
    $('img[srcset], source[srcset]').each((_, elem) => {
      const srcset = $(elem).attr('srcset');
      if (srcset) {
        const newSrcset = srcset.split(',').map(src => {
          const [url, ...rest] = src.trim().split(' ');
          const absoluteUrl = normalizeUrl(url, baseUrl);
          assetDownloads.push(this.downloadAsset(absoluteUrl, AssetType.Image, depth + 1));
          return [this.getRelativeUrl(absoluteUrl, baseUrl), ...rest].join(' ');
        }).join(', ');
        $(elem).attr('srcset', newSrcset);
      }
    });

    // Process stylesheets
    $('link[rel="stylesheet"][href]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        const absoluteUrl = normalizeUrl(href, baseUrl);
        assetDownloads.push(this.downloadAsset(absoluteUrl, AssetType.CSS, depth + 1));
        $(elem).attr('href', this.getRelativeUrl(absoluteUrl, baseUrl));
      }
    });

    // Process scripts
    $('script[src]').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const absoluteUrl = normalizeUrl(src, baseUrl);
        assetDownloads.push(this.downloadAsset(absoluteUrl, AssetType.JavaScript, depth + 1));
        $(elem).attr('src', this.getRelativeUrl(absoluteUrl, baseUrl));
      }
    });

    // Process links (icons, etc)
    $('link[href]').not('[rel="stylesheet"]').each((_, elem) => {
      const href = $(elem).attr('href');
      const rel = $(elem).attr('rel');
      if (href && (rel === 'icon' || rel === 'shortcut icon' || rel === 'apple-touch-icon')) {
        const absoluteUrl = normalizeUrl(href, baseUrl);
        assetDownloads.push(this.downloadAsset(absoluteUrl, AssetType.Image, depth + 1));
        $(elem).attr('href', this.getRelativeUrl(absoluteUrl, baseUrl));
      }
    });

    // Process inline styles
    const inlineStylePromises: Promise<void>[] = [];
    $('[style]').each((_, elem) => {
      const style = $(elem).attr('style');
      if (style) {
        const promise = this.processInlineCss(style, baseUrl, depth).then(processedStyle => {
          $(elem).attr('style', processedStyle);
        });
        inlineStylePromises.push(promise);
      }
    });

    // Process style tags
    const styleTagPromises: Promise<void>[] = [];
    $('style').each((_, elem) => {
      const cssContent = $(elem).html();
      if (cssContent) {
        const promise = this.processCss(cssContent, baseUrl, depth).then(processed => {
          $(elem).html(processed);
        });
        styleTagPromises.push(promise);
      }
    });

    // Wait for inline styles and style tags to be processed
    await Promise.all([...inlineStylePromises, ...styleTagPromises]);

    // Process anchors (if following links)
    if (this.options.followExternalLinks || depth < this.options.maxDepth) {
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          const absoluteUrl = normalizeUrl(href, baseUrl);
          if (isSameDomain(absoluteUrl, this.options.url)) {
            assetDownloads.push(this.downloadAsset(absoluteUrl, AssetType.HTML, depth + 1));
            $(elem).attr('href', this.getRelativeUrl(absoluteUrl, baseUrl));
          }
        }
      });
    }

    // Wait for all assets to be queued
    await Promise.all(assetDownloads);

    return $.html();
  }

  /**
   * Process CSS content and extract assets
   */
  private async processCss(cssContent: string, baseUrl: string, depth: number): Promise<string> {
    try {
      // Extract URLs from url() and @import
      const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
      const importRegex = /@import\s+['"]([^'"]+)['"]/g;

      const assetDownloads: Promise<void>[] = [];
      const urlMap = new Map<string, string>();

      // Process url() references
      let match;
      while ((match = urlRegex.exec(cssContent)) !== null) {
        const url = match[1];
        if (!url.startsWith('data:')) {
          const absoluteUrl = normalizeUrl(url, baseUrl);
          const assetType = getAssetType(absoluteUrl);
          assetDownloads.push(this.downloadAsset(absoluteUrl, assetType, depth + 1));
          urlMap.set(url, this.getRelativeUrl(absoluteUrl, baseUrl));
        }
      }

      // Process @import
      while ((match = importRegex.exec(cssContent)) !== null) {
        const url = match[1];
        const absoluteUrl = normalizeUrl(url, baseUrl);
        assetDownloads.push(this.downloadAsset(absoluteUrl, AssetType.CSS, depth + 1));
        urlMap.set(url, this.getRelativeUrl(absoluteUrl, baseUrl));
      }

      await Promise.all(assetDownloads);

      // Replace URLs in CSS
      let processedCss = cssContent;
      urlMap.forEach((newUrl, oldUrl) => {
        processedCss = processedCss.replace(
          new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newUrl
        );
      });

      return processedCss;
    } catch (error) {
      console.warn(`Failed to process CSS from ${baseUrl}:`, error);
      return cssContent;
    }
  }

  /**
   * Process inline CSS
   */
  private async processInlineCss(cssContent: string, baseUrl: string, depth: number): Promise<string> {
    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
    const assetDownloads: Promise<void>[] = [];
    const urlMap = new Map<string, string>();

    let match;
    while ((match = urlRegex.exec(cssContent)) !== null) {
      const url = match[1];
      if (!url.startsWith('data:')) {
        const absoluteUrl = normalizeUrl(url, baseUrl);
        const assetType = getAssetType(absoluteUrl);
        assetDownloads.push(this.downloadAsset(absoluteUrl, assetType, depth + 1));
        urlMap.set(url, this.getRelativeUrl(absoluteUrl, baseUrl));
      }
    }

    await Promise.all(assetDownloads);

    let processedCss = cssContent;
    urlMap.forEach((newUrl, oldUrl) => {
      processedCss = processedCss.replace(
        new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        newUrl
      );
    });

    return processedCss;
  }

  /**
   * Get relative URL for local reference
   */
  private getRelativeUrl(absoluteUrl: string, baseUrl: string): string {
    const cleanedUrl = cleanUrl(absoluteUrl);
    const localPath = getLocalPath(cleanedUrl, this.options.url, this.options.outputDir);
    const basePath = getLocalPath(baseUrl, this.options.url, this.options.outputDir);
    return getRelativePath(basePath, localPath);
  }

  /**
   * Wait for all downloads in queue
   */
  private async waitForQueue(): Promise<void> {
    while (this.concurrencyQueue.length > 0) {
      await Promise.all(this.concurrencyQueue);
      this.concurrencyQueue = [];

      // Give a small delay to catch any newly queued items
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Print statistics
   */
  private printStats(): void {
    const duration = this.stats.endTime
      ? ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2)
      : '?';

    console.log('\n=== Download Complete ===');
    console.log(`Total assets: ${this.stats.totalAssets}`);
    console.log(`Downloaded: ${this.stats.downloadedAssets}`);
    console.log(`Failed: ${this.stats.failedAssets}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Output: ${this.options.outputDir}`);
  }
}
