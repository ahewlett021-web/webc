#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { CompanyProcessor } from './processor';
import { ProcessorOptions } from './types';

const program = new Command();

program
  .name('company-finder')
  .description('Find company websites and extract phone numbers from CSV data')
  .version('1.0.0')
  .argument('<input-csv>', 'Input CSV file with company data')
  .option('-o, --output <file>', 'Output CSV file', 'results.csv')
  .option('-c, --concurrency <number>', 'Number of concurrent requests', '3')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '15000')
  .option('-d, --delay <ms>', 'Delay between requests in milliseconds', '1000')
  .option('-r, --retries <number>', 'Maximum number of retries', '2')
  .action(async (inputCsv: string, options: any) => {
    try {
      // Validate input file
      if (!fs.existsSync(inputCsv)) {
        console.error(chalk.red(`Error: Input file not found: ${inputCsv}`));
        process.exit(1);
      }

      // Prepare options
      const processorOptions: ProcessorOptions = {
        inputFile: path.resolve(inputCsv),
        outputFile: path.resolve(options.output),
        concurrency: parseInt(options.concurrency, 10),
        timeout: parseInt(options.timeout, 10),
        maxRetries: parseInt(options.retries, 10),
        delayBetweenRequests: parseInt(options.delay, 10)
      };

      // Validate options
      if (processorOptions.concurrency < 1 || processorOptions.concurrency > 20) {
        console.error(chalk.red('Error: Concurrency must be between 1 and 20'));
        process.exit(1);
      }

      if (processorOptions.timeout < 1000) {
        console.error(chalk.red('Error: Timeout must be at least 1000ms'));
        process.exit(1);
      }

      // Create processor and run
      const processor = new CompanyProcessor(processorOptions);
      await processor.processCompanies();

      console.log(chalk.bold.green('✓ Processing complete!\n'));
    } catch (error: any) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program.parse();
