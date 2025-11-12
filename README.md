# WebC - Professional Website Copier

A professional-grade website copier that downloads all assets (HTML, CSS, JavaScript, images, fonts, etc.) while preserving the complete site structure and maintaining all internal links.

## Features

- **Complete Asset Download**: Automatically downloads all assets including:
  - HTML pages
  - CSS stylesheets (with @import and url() resolution)
  - JavaScript files
  - Images (including srcset support)
  - Fonts
  - Icons and favicons
  - Other resources

- **Smart Link Rewriting**: Converts absolute URLs to relative paths to ensure the site works offline

- **Structure Preservation**: Maintains the original directory structure and file organization

- **Concurrent Downloads**: Configurable concurrency for faster downloads

- **CSS Processing**: Parses CSS files to extract and download referenced assets

- **HTML Processing**: Processes all HTML elements that reference external resources

- **Depth Control**: Limit how deep the crawler should follow links

- **External Link Support**: Optionally follow and download external resources

## Installation

```bash
npm install
npm run build
```

## Usage

### Command Line

Basic usage:
```bash
npm start -- <url>
```

With options:
```bash
npm start -- https://example.com -o ./my-site -d 5 -c 10
```

### Options

- `-o, --output <dir>`: Output directory (default: `./output`)
- `-d, --depth <number>`: Maximum crawl depth (default: `3`)
- `-e, --external`: Follow external links (default: `false`)
- `-c, --concurrency <number>`: Number of concurrent downloads (default: `5`)
- `-t, --timeout <ms>`: Request timeout in milliseconds (default: `30000`)
- `-u, --user-agent <string>`: Custom user agent

### Examples

Download a website with default settings:
```bash
npm start -- https://example.com
```

Download with custom output directory and depth:
```bash
npm start -- https://example.com -o ./downloaded-site -d 5
```

Download with higher concurrency for faster downloads:
```bash
npm start -- https://example.com -c 10
```

Follow external links:
```bash
npm start -- https://example.com -e
```

Combine multiple options:
```bash
npm start -- https://example.com -o ./site -d 10 -c 15 -e
```

## Programmatic Usage

You can also use WebC as a library in your own Node.js projects:

```typescript
import { WebsiteCopier } from './src/copier';

const copier = new WebsiteCopier({
  url: 'https://example.com',
  outputDir: './output',
  maxDepth: 3,
  followExternalLinks: false,
  concurrency: 5,
  timeout: 30000
});

await copier.copy();
```

## How It Works

1. **Initial Download**: Starts by downloading the main page from the provided URL

2. **Asset Discovery**: Parses HTML to find all referenced assets:
   - Images (`<img src>`, `srcset`)
   - Stylesheets (`<link rel="stylesheet">`)
   - Scripts (`<script src>`)
   - Links (`<a href>` - if within depth limit)
   - Icons and favicons
   - Inline styles

3. **CSS Processing**: For each CSS file:
   - Extracts `url()` references (images, fonts, etc.)
   - Extracts `@import` statements
   - Downloads all referenced assets
   - Rewrites URLs to local paths

4. **Link Rewriting**: Converts all absolute URLs to relative paths so the site works offline

5. **Concurrent Downloading**: Downloads multiple assets in parallel (configurable)

6. **Structure Preservation**: Saves files in the same directory structure as the original site

## Output Structure

The downloaded site maintains the original structure:

```
output/
├── index.html
├── css/
│   ├── style.css
│   └── theme.css
├── js/
│   ├── main.js
│   └── vendor.js
├── images/
│   ├── logo.png
│   └── hero.jpg
└── fonts/
    ├── font.woff2
    └── font.woff
```

## Features in Detail

### Link Rewriting

All URLs are converted to relative paths:
- `https://example.com/css/style.css` → `../css/style.css`
- `https://example.com/images/logo.png` → `../images/logo.png`

### CSS Processing

Handles various CSS URL formats:
```css
/* Standard url() */
background: url('/images/bg.jpg');

/* @import statements */
@import url('theme.css');
@import 'components.css';

/* Font declarations */
@font-face {
  src: url('/fonts/font.woff2') format('woff2');
}
```

### HTML Processing

Processes all relevant HTML attributes:
```html
<!-- Images -->
<img src="/image.jpg" srcset="/image-2x.jpg 2x">

<!-- Stylesheets -->
<link rel="stylesheet" href="/style.css">

<!-- Scripts -->
<script src="/script.js"></script>

<!-- Icons -->
<link rel="icon" href="/favicon.ico">

<!-- Inline styles -->
<div style="background: url('/bg.jpg')"></div>
```

## Limitations

- Does not execute JavaScript (downloads static resources only)
- Does not handle dynamically loaded content (AJAX, fetch)
- Query parameters in URLs are converted to filename hashes
- Some sites may block automated access (use custom user-agent if needed)

## Requirements

- Node.js 16 or higher
- npm or yarn

## Dependencies

- **axios**: HTTP client for downloading resources
- **cheerio**: HTML parsing and manipulation
- **css**: CSS parsing
- **commander**: CLI interface
- **chalk**: Terminal styling
- **mime-types**: MIME type detection

## Development

Build the project:
```bash
npm run build
```

Run in development mode:
```bash
npm run dev -- <url>
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Use Cases

- Create offline backups of websites
- Archive web content
- Development and testing
- Website migration
- Documentation preservation

## Security and Ethics

This tool should be used responsibly and ethically:
- Respect robots.txt and website terms of service
- Don't overload servers with too many concurrent requests
- Only copy websites you have permission to copy
- Be mindful of copyright and intellectual property
