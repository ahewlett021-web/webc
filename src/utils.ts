import * as fs from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { CompanyRecord, CompanyResult } from './types';

/**
 * Read CSV file and parse into company records
 */
export async function readCSV(filePath: string): Promise<CompanyRecord[]> {
  return new Promise((resolve, reject) => {
    const records: CompanyRecord[] = [];

    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (record) => {
        records.push(record);
      })
      .on('end', () => {
        resolve(records);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Write results to CSV file
 */
export async function writeCSV(filePath: string, records: CompanyResult[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const writableStream = fs.createWriteStream(filePath);

    const stringifier = stringify({
      header: true,
      columns: [
        'company_name',
        'company_number',
        'company_status',
        'company_type',
        'registered_office_address',
        'website_found',
        'website_url',
        'phone_number_found',
        'phone_numbers',
        'search_status'
      ]
    });

    stringifier.pipe(writableStream);

    records.forEach(record => {
      stringifier.write(record);
    });

    stringifier.end();

    writableStream.on('finish', () => {
      resolve();
    });

    writableStream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Clean company name for search
 */
export function cleanCompanyName(name: string): string {
  return name
    .replace(/\s+(LIMITED|LTD|LTD\.|PLC|CYF)$/i, '')
    .trim();
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract UK phone numbers from text
 */
export function extractPhoneNumbers(text: string): string[] {
  const phonePatterns = [
    // UK landline: 01234 567890, 0161 123 4567, etc.
    /\b0\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g,
    // UK mobile: 07123 456789
    /\b07\d{3}[\s-]?\d{6}\b/g,
    // International format: +44 1234 567890
    /\+44[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g,
    // Formatted: (01234) 567890
    /\(\d{3,5}\)[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g,
    // With dots: 01234.567890
    /\b0\d{2,4}\.\d{3,4}\.\d{3,4}\b/g
  ];

  const foundNumbers = new Set<string>();

  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the number
        const cleaned = match.replace(/[\s\-\.]/g, '');
        // Only add if it looks like a valid UK number
        if (cleaned.length >= 10 && cleaned.length <= 15) {
          foundNumbers.add(match.trim());
        }
      });
    }
  }

  return Array.from(foundNumbers);
}

/**
 * Validate if URL is accessible
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
