import pLimit from 'p-limit';
import chalk from 'chalk';
import { CompanyRecord, CompanyResult, ProcessorOptions } from './types';
import { findCompanyWebsite } from './websiteFinder';
import { extractPhoneFromWebsite, findContactPagePhone } from './phoneExtractor';
import { delay, readCSV, writeCSV } from './utils';

export class CompanyProcessor {
  private options: ProcessorOptions;
  private processedCount: number = 0;
  private totalCount: number = 0;
  private startTime: number = 0;

  constructor(options: ProcessorOptions) {
    this.options = options;
  }

  /**
   * Process all companies from CSV
   */
  async processCompanies(): Promise<void> {
    console.log(chalk.bold.cyan('\n📊 Company Website & Phone Finder\n'));
    console.log(chalk.gray(`Reading from: ${this.options.inputFile}`));

    // Read input CSV
    const companies = await readCSV(this.options.inputFile);
    this.totalCount = companies.length;

    console.log(chalk.gray(`Found ${this.totalCount} companies to process\n`));
    console.log(chalk.gray(`Concurrency: ${this.options.concurrency}`));
    console.log(chalk.gray(`Timeout: ${this.options.timeout}ms`));
    console.log(chalk.gray(`Delay between requests: ${this.options.delayBetweenRequests}ms\n`));

    this.startTime = Date.now();

    // Create rate limiter
    const limit = pLimit(this.options.concurrency);

    // Process companies with concurrency limit
    const results = await Promise.all(
      companies.map((company, index) =>
        limit(() => this.processCompany(company, index + 1))
      )
    );

    // Write results to output CSV
    console.log(chalk.cyan(`\nWriting results to: ${this.options.outputFile}`));
    await writeCSV(this.options.outputFile, results);

    this.printSummary(results);
  }

  /**
   * Process a single company
   */
  private async processCompany(
    company: CompanyRecord,
    index: number
  ): Promise<CompanyResult> {
    const result: CompanyResult = {
      ...company,
      website_found: 'No',
      website_url: '',
      phone_number_found: 'No',
      phone_numbers: '',
      search_status: 'Processing'
    };

    try {
      console.log(
        chalk.blue(`[${index}/${this.totalCount}]`) +
        ` Processing: ${chalk.bold(company.company_name)}`
      );

      // Add delay between requests
      if (this.options.delayBetweenRequests > 0) {
        await delay(this.options.delayBetweenRequests);
      }

      // Find website
      const website = await findCompanyWebsite(
        company.company_name,
        this.options.timeout
      );

      if (website) {
        result.website_found = 'Yes';
        result.website_url = website;
        console.log(chalk.green(`  ✓ Website found: ${website}`));

        // Extract phone numbers from main page
        let phoneNumbers = await extractPhoneFromWebsite(website, this.options.timeout);

        // If no phone found on main page, try contact page
        if (phoneNumbers.length === 0) {
          console.log(chalk.yellow('  → Checking contact page...'));
          phoneNumbers = await findContactPagePhone(website, this.options.timeout);
        }

        if (phoneNumbers.length > 0) {
          result.phone_number_found = 'Yes';
          result.phone_numbers = phoneNumbers.join('; ');
          console.log(chalk.green(`  ✓ Phone(s) found: ${result.phone_numbers}`));
        } else {
          console.log(chalk.yellow('  ○ No phone numbers found'));
        }

        result.search_status = 'Success';
      } else {
        console.log(chalk.yellow('  ○ No website found'));
        result.search_status = 'No website found';
      }
    } catch (error: any) {
      console.log(chalk.red(`  ✗ Error: ${error.message}`));
      result.search_status = `Error: ${error.message}`;
    }

    this.processedCount++;
    this.printProgress();

    return result;
  }

  /**
   * Print progress
   */
  private printProgress(): void {
    const percentage = ((this.processedCount / this.totalCount) * 100).toFixed(1);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);
    const rate = (this.processedCount / (Date.now() - this.startTime) * 1000).toFixed(2);

    process.stdout.write(
      chalk.gray(
        `\r  Progress: ${this.processedCount}/${this.totalCount} (${percentage}%) | ` +
        `Elapsed: ${elapsed}s | Rate: ${rate}/s`
      )
    );
  }

  /**
   * Print summary
   */
  private printSummary(results: CompanyResult[]): void {
    const websitesFound = results.filter(r => r.website_found === 'Yes').length;
    const phonesFound = results.filter(r => r.phone_number_found === 'Yes').length;
    const errors = results.filter(r => r.search_status.startsWith('Error')).length;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log(chalk.bold.cyan('\n\n═══ Summary ═══'));
    console.log(chalk.gray(`Total companies: ${this.totalCount}`));
    console.log(chalk.green(`Websites found: ${websitesFound} (${((websitesFound / this.totalCount) * 100).toFixed(1)}%)`));
    console.log(chalk.green(`Phone numbers found: ${phonesFound} (${((phonesFound / this.totalCount) * 100).toFixed(1)}%)`));
    console.log(chalk.red(`Errors: ${errors}`));
    console.log(chalk.gray(`Total time: ${elapsed}s`));
    console.log(chalk.gray(`Output file: ${this.options.outputFile}\n`));
  }
}
