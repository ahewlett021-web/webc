export interface CopierOptions {
  url: string;
  outputDir: string;
  maxDepth?: number;
  followExternalLinks?: boolean;
  userAgent?: string;
  timeout?: number;
  concurrency?: number;
}

export interface DownloadedAsset {
  url: string;
  localPath: string;
  type: AssetType;
}

export enum AssetType {
  HTML = 'html',
  CSS = 'css',
  JavaScript = 'javascript',
  Image = 'image',
  Font = 'font',
  Other = 'other'
}

export interface ProcessingStats {
  totalAssets: number;
  downloadedAssets: number;
  failedAssets: number;
  startTime: number;
  endTime?: number;
}
