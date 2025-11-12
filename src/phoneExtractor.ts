import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractPhoneNumbers } from './utils';

/**
 * Extract phone numbers from a website
 */
export async function extractPhoneFromWebsite(
  url: string,
  timeout: number = 10000
): Promise<string[]> {
  try {
    const response = await axios.get(url, {
      timeout,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script, style, noscript').remove();

    // Get text content
    const bodyText = $('body').text();

    // Also check common phone number locations
    const contactText = [
      $('footer').text(),
      $('[class*="contact"]').text(),
      $('[id*="contact"]').text(),
      $('[class*="phone"]').text(),
      $('[id*="phone"]').text(),
      $('a[href^="tel:"]').text(),
      $('a[href^="tel:"]').attr('href') || ''
    ].join(' ');

    // Extract phone numbers from all text
    const allText = `${bodyText} ${contactText}`;
    const phoneNumbers = extractPhoneNumbers(allText);

    // Also check tel: links
    $('a[href^="tel:"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const telNumber = href.replace('tel:', '').trim();
        const extracted = extractPhoneNumbers(telNumber);
        phoneNumbers.push(...extracted);
      }
    });

    // Remove duplicates
    return Array.from(new Set(phoneNumbers));
  } catch (error: any) {
    console.error(`Error extracting phone from ${url}:`, error.message);
    return [];
  }
}

/**
 * Try to find contact page and extract phone numbers
 */
export async function findContactPagePhone(
  baseUrl: string,
  timeout: number = 10000
): Promise<string[]> {
  const contactPaths = [
    '/contact',
    '/contact-us',
    '/contactus',
    '/about',
    '/about-us',
    '/get-in-touch'
  ];

  for (const path of contactPaths) {
    try {
      const url = new URL(path, baseUrl).href;
      const phones = await extractPhoneFromWebsite(url, timeout);
      if (phones.length > 0) {
        return phones;
      }
    } catch {
      // Continue to next path
    }
  }

  return [];
}
