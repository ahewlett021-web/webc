import axios from 'axios';
import * as cheerio from 'cheerio';
import { cleanCompanyName, isValidUrl } from './utils';

/**
 * Search for company website using DuckDuckGo HTML search
 */
export async function findCompanyWebsite(
  companyName: string,
  timeout: number = 10000
): Promise<string | null> {
  try {
    const cleanName = cleanCompanyName(companyName);
    const searchQuery = encodeURIComponent(`${cleanName} UK official website`);

    // Use DuckDuckGo HTML search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

    const response = await axios.get(searchUrl, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);
    const results: string[] = [];

    // Extract URLs from search results
    $('.result__url').each((_, element) => {
      const urlText = $(element).text().trim();
      if (urlText) {
        // Clean up the URL
        let url = urlText;
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        results.push(url);
      }
    });

    // Also check result links
    $('.result__a').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.startsWith('//duckduckgo.com/l/?')) {
        // Extract actual URL from DuckDuckGo redirect
        try {
          const params = new URLSearchParams(href.split('?')[1]);
          const actualUrl = params.get('uddg');
          if (actualUrl) {
            results.push(actualUrl);
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
    });

    // Filter out unwanted domains
    const filteredResults = results.filter(url => {
      const lowerUrl = url.toLowerCase();
      return !lowerUrl.includes('linkedin.com') &&
             !lowerUrl.includes('facebook.com') &&
             !lowerUrl.includes('twitter.com') &&
             !lowerUrl.includes('companies-house.gov.uk') &&
             !lowerUrl.includes('companieshouse.gov.uk') &&
             !lowerUrl.includes('endole.co.uk') &&
             !lowerUrl.includes('wikipedia.org') &&
             isValidUrl(url);
    });

    // Return the first valid result
    return filteredResults.length > 0 ? filteredResults[0] : null;
  } catch (error: any) {
    console.error(`Error finding website for ${companyName}:`, error.message);
    return null;
  }
}

/**
 * Verify if a URL is accessible
 */
export async function verifyWebsite(url: string, timeout: number = 5000): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.status < 400;
  } catch {
    // Try GET request if HEAD fails
    try {
      const response = await axios.get(url, {
        timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.status < 400;
    } catch {
      return false;
    }
  }
}
