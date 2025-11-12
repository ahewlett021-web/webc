#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { WebsiteCopier } from './copier';
import { CopierOptions } from './types';

const program = new Command();

program
  .name('webc')
  .description('Professional website copier that downloads all assets while preserving site structure')
  .version('1.0.0')
  .argument('<url>', 'URL of the website to copy')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-d, --depth <number>', 'Maximum crawl depth', '3')
  .option('-e, --external', 'Follow external links', false)
  .option('-c, --concurrency <number>', 'Number of concurrent downloads', '5')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('-u, --user-agent <string>', 'Custom user agent')
  .action(async (url: string, options: any) => {
    try {
      // Validate URL
      try {
        new URL(url);
      } catch {
        console.error(chalk.red('Error: Invalid URL provided'));
        process.exit(1);
      }

      // Prepare options
      const copierOptions: CopierOptions = {
        url,
        outputDir: path.resolve(options.output),
        maxDepth: parseInt(options.depth, 10),
        followExternalLinks: options.external,
        concurrency: parseInt(options.concurrency, 10),
        timeout: parseInt(options.timeout, 10),
      };

      if (options.userAgent) {
        copierOptions.userAgent = options.userAgent;
      }

      // Display configuration
      console.log(chalk.bold.cyan('\n🌐 Website Copier\n'));
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  URL: ${url}`));
      console.log(chalk.gray(`  Output: ${copierOptions.outputDir}`));
      console.log(chalk.gray(`  Max Depth: ${copierOptions.maxDepth}`));
      console.log(chalk.gray(`  Follow External: ${copierOptions.followExternalLinks}`));
      console.log(chalk.gray(`  Concurrency: ${copierOptions.concurrency}`));
      console.log(chalk.gray(`  Timeout: ${copierOptions.timeout}ms\n`));

      // Create copier and start
      const copier = new WebsiteCopier(copierOptions);
      await copier.copy();

      console.log(chalk.bold.green('\n✓ Website copied successfully!\n'));
    } catch (error: any) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program.parse();
