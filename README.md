# Company Website & Phone Finder

A professional tool to automatically find company websites and extract phone numbers from CSV data containing UK company information.

## Features

- **Automated Website Discovery**: Searches for company websites using web search
- **Phone Number Extraction**: Intelligently extracts UK phone numbers from websites
- **Contact Page Detection**: Automatically checks contact pages if phone not found on homepage
- **CSV Input/Output**: Easy to use with CSV files
- **Rate Limiting**: Configurable concurrency and delays to avoid overwhelming servers
- **Progress Tracking**: Real-time progress display with statistics
- **Comprehensive Patterns**: Detects various UK phone number formats:
  - Landlines: 01234 567890, 0161 123 4567
  - Mobiles: 07123 456789
  - International: +44 1234 567890
  - Various formatting styles

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Usage

```bash
npm start <input-csv>
```

### With Options

```bash
npm start companies.csv -o results.csv -c 5 -d 2000
```

### Command Line Options

- `<input-csv>`: Required. Path to input CSV file with company data
- `-o, --output <file>`: Output CSV file (default: `results.csv`)
- `-c, --concurrency <number>`: Number of concurrent requests (default: `3`, max: `20`)
- `-t, --timeout <ms>`: Request timeout in milliseconds (default: `15000`)
- `-d, --delay <ms>`: Delay between requests in milliseconds (default: `1000`)
- `-r, --retries <number>`: Maximum number of retries (default: `2`)

## Input CSV Format

The tool expects a CSV file with the following columns (at minimum):

```csv
company_name,company_number,company_status,company_type,registered_office_address
HAWKWELL PARK LIMITED,07646702,Active,Private limited company,2 Lyne Road Virginia Water GU25 4EF England
```

Required columns:
- `company_name`: Company name
- `company_number`: Companies House number
- `company_status`: Status (Active, Dissolved, etc.)
- `company_type`: Type of company
- `registered_office_address`: Registered address

Additional columns will be preserved in the output.

## Output CSV Format

The output CSV includes all input columns plus:

- `website_found`: "Yes" or "No"
- `website_url`: The discovered website URL
- `phone_number_found`: "Yes" or "No"
- `phone_numbers`: Extracted phone numbers (semicolon-separated if multiple)
- `search_status`: Status of the search ("Success", "No website found", or error message)

Example output:

```csv
company_name,company_number,website_found,website_url,phone_number_found,phone_numbers,search_status
HAWKWELL PARK LIMITED,07646702,Yes,https://example.com,Yes,01234 567890,Success
```

## How It Works

1. **Read CSV**: Parses the input CSV file and extracts company records
2. **Search for Website**: For each company:
   - Cleans the company name (removes Ltd, Limited, etc.)
   - Performs web search using DuckDuckGo
   - Filters out social media and directory sites
   - Returns the most relevant website URL
3. **Extract Phone Numbers**:
   - Downloads the website homepage
   - Searches for UK phone number patterns
   - If not found, tries common contact page URLs
   - Extracts all matching phone numbers
4. **Write Results**: Outputs all findings to a CSV file

## Performance Considerations

### Recommended Settings

For best results and to be respectful to web servers:

- **Small datasets (<100 companies)**:
  ```bash
  npm start input.csv -c 3 -d 1000
  ```

- **Medium datasets (100-1000 companies)**:
  ```bash
  npm start input.csv -c 5 -d 1500
  ```

- **Large datasets (>1000 companies)**:
  ```bash
  npm start input.csv -c 5 -d 2000
  ```

### Processing Time

Approximate processing times:
- 100 companies: ~5-10 minutes (with -c 5 -d 1000)
- 500 companies: ~25-50 minutes (with -c 5 -d 1500)
- 1000 companies: ~50-100 minutes (with -c 5 -d 2000)

## Phone Number Detection

The tool detects various UK phone number formats:

```
Standard formats:
- 01234 567890
- 0161 123 4567
- 07123 456789

With separators:
- 01234-567890
- 01234.567.890
- (01234) 567890

International format:
- +44 1234 567890
- +44 (0)1234 567890

Tel links:
- <a href="tel:01234567890">
```

## Error Handling

The tool handles various error scenarios:

- **Website not found**: Marks `website_found` as "No"
- **Website unreachable**: Continues processing, logs error
- **Phone extraction failure**: Marks `phone_number_found` as "No"
- **Invalid CSV**: Displays error and exits
- **Network errors**: Retries based on `--retries` setting

## Examples

### Example 1: Quick Processing

```bash
npm start companies.csv
```

This will:
- Read from `companies.csv`
- Output to `results.csv`
- Use 3 concurrent requests
- 1 second delay between requests

### Example 2: Faster Processing

```bash
npm start companies.csv -o output.csv -c 10 -d 500
```

This will:
- Process faster with 10 concurrent requests
- Only 500ms delay between requests
- Output to `output.csv`

### Example 3: Conservative Processing

```bash
npm start companies.csv -c 2 -d 3000 -t 20000
```

This will:
- Use only 2 concurrent requests
- 3 second delay between requests
- 20 second timeout for slow websites

## Limitations

- Only searches for official company websites (filters out social media)
- Phone number extraction depends on website structure
- Some websites may block automated access
- Rate limits depend on your network and target websites
- DuckDuckGo search may have rate limiting

## Best Practices

1. **Start Small**: Test with a small subset first
2. **Be Respectful**: Use appropriate delays to avoid overwhelming servers
3. **Monitor Progress**: Watch the console output for any patterns of failures
4. **Review Results**: Manually verify a sample of results
5. **Handle Errors**: Check the `search_status` column for any issues

## Programmatic Usage

You can also use this as a library:

```typescript
import { CompanyProcessor } from './src/processor';

const processor = new CompanyProcessor({
  inputFile: 'companies.csv',
  outputFile: 'results.csv',
  concurrency: 5,
  timeout: 15000,
  maxRetries: 2,
  delayBetweenRequests: 1000
});

await processor.processCompanies();
```

## Troubleshooting

### No websites found

- Check your internet connection
- Try reducing concurrency (-c 2)
- Increase delay (-d 3000)
- Verify company names in input CSV

### Getting blocked

- Reduce concurrency to 1-2
- Increase delay to 3000-5000ms
- Add longer timeout (-t 30000)

### CSV parsing errors

- Ensure CSV has headers
- Check for proper quoting of fields with commas
- Verify file encoding (UTF-8 recommended)

## Dependencies

- **axios**: HTTP client for web requests
- **cheerio**: HTML parsing and scraping
- **csv-parse/csv-stringify**: CSV file handling
- **p-limit**: Concurrency control
- **chalk**: Terminal styling
- **commander**: CLI interface

## License

MIT

## Ethical Use

This tool should be used ethically and responsibly:
- Only process companies you have legitimate business need for
- Respect website terms of service
- Don't overwhelm servers with too many requests
- Use appropriate rate limiting
- Don't use for spam or unauthorized marketing
