# Billing Extension

A browser extension that automatically extracts bill information from email content and allows you to export bills in CSV format for import into accounting systems like QuickBooks.

## Features

- **AI-Powered Extraction**: Uses Chrome's built-in Prompt API (Gemini Nano) to intelligently extract bill information from email text
- **Email Integration**: Works seamlessly with Gmail and Outlook (Office 365, Outlook.com, Outlook Live)
- **Easy Extraction**: Simply right-click on selected text in an email and choose "Mark as Bill"
- **Smart Data Capture**: Automatically extracts:
  - Bill Number
  - Supplier/Vendor
  - Bill Date & Due Date
  - Terms, Location, Memo
  - Account, Line Description, Line Amount
  - Currency
- **Missing Field Handling**: Prompts for any required information that couldn't be extracted automatically
- **Bill Management**: 
  - View all your bills in an organized list
  - Filter to show only new/unexported bills
  - Select multiple bills for batch export
- **CSV Export**: Export bills in a format compatible with accounting software imports (QuickBooks format)
- **Local Storage**: All data is stored locally in your browser - no cloud dependency

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Chrome, Edge, or Firefox browser

### Build Steps

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd listicle/ui/billing-ext
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   # For Chrome/Edge
   npm run build

   # For Firefox
   npm run build:firefox
   ```

4. **Load the extension as an unpacked extension**:

   After building, you'll need to load the extension manually in developer mode. Here's how:

   **For Chrome or Edge:**

   1. Open your browser and navigate to the extensions management page:
      - **Chrome**: Type `chrome://extensions/` in the address bar and press Enter
      - **Edge**: Type `edge://extensions/` in the address bar and press Enter

   2. Enable Developer Mode:
      - Look for a toggle switch labeled "Developer mode" in the top-right corner of the page
      - Toggle it **ON** (it should turn blue/active)

   3. Load the unpacked extension:
      - Click the **"Load unpacked"** button that appears after enabling Developer mode
      - A file picker dialog will open
      - Navigate to your project directory: `ui/billing-ext/.output/chrome-mv3`
      - Select the `chrome-mv3` folder (not a file inside it, the folder itself)
      - Click **"Select Folder"** (or "Open" depending on your OS)

   4. Verify installation:
      - The extension should now appear in your extensions list
      - You should see the extension name and icon
      - Make sure it's enabled (toggle switch should be ON)

   **For Firefox:**

   1. Open Firefox and navigate to the debugging page:
      - Type `about:debugging#/runtime/this-firefox` in the address bar and press Enter

   2. Load the temporary add-on:
      - Click the **"Load Temporary Add-on…"** button
      - A file picker dialog will open
      - Navigate to your project directory: `ui/billing-ext/.output/firefox-mv3`
      - Select the `manifest.json` file (not the folder, but the file itself)
      - Click **"Open"**

   3. Verify installation:
      - The extension should appear in the list with its name and ID
      - You should see it listed under "This Firefox" section

5. **Development mode** (optional):
   ```bash
   # For Chrome/Edge
   npm run dev

   # For Firefox
   npm run dev:firefox
   ```
   This will watch for file changes and automatically rebuild the extension.

## Usage

### Extracting Bills from Emails

1. **Open an email** in Gmail or Outlook containing bill information
2. **Select the text** that contains the bill details (you can select the entire email body)
3. **Right-click** on the selected text
4. **Choose "Mark as Bill"** from the context menu
5. The extension will:
   - Show a loading indicator while processing
   - Extract bill information using AI
   - If any required fields are missing, you'll see a form to fill them in
   - Save the bill to your local database

### Managing Bills

1. **Open the extension popup** by clicking the extension icon in your browser toolbar
2. **View your bills** in the list:
   - By default, only new (unexported) bills are shown
   - Check the "New only" filter to see all bills, including exported ones
3. **Select bills**:
   - Click individual checkboxes to select specific bills
   - Use the "select all" checkbox in the header to select/deselect all visible bills
4. **Export bills**:
   - Select the bills you want to export
   - Click the "Export" button
   - A CSV file will be downloaded with the format:
     ```
     *BillNo,*Supplier,*BillDate,*DueDate,Terms,Location,Memo,*Account,LineDescription,*LineAmount,Currency
     ```
   - Exported bills are automatically marked as exported and will be filtered out when "New only" is enabled

### CSV Export Format

The exported CSV follows a QuickBooks-compatible format with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| *BillNo | Yes | Bill/Invoice number |
| *Supplier | Yes | Supplier/Vendor name |
| *BillDate | Yes | Bill date (DD/MM/YYYY format) |
| *DueDate | Yes | Due date (DD/MM/YYYY format) |
| Terms | No | Payment terms (e.g., "Net 15", "Net 30") |
| Location | No | Location/Department |
| Memo | No | Additional notes |
| *Account | Yes | Accounting account code |
| LineDescription | No | Description of the line item |
| *LineAmount | Yes | Bill amount |
| Currency | No | Currency code (defaults to USD if not specified) |

Fields marked with `*` are mandatory.

## Technical Details

### Architecture

- **Event Sourcing**: Uses domain events to track bill state changes
- **IndexedDB Storage**: Local database for persistence (Dexie.js)
- **Vue 3**: Modern reactive UI framework
- **TypeScript**: Full type safety
- **WXT**: Extension development framework

### Supported Email Providers

- Gmail (`mail.google.com`)
- Outlook Live (`outlook.live.com`)
- Outlook Office (`outlook.office.com`)
- Outlook Office 365 (`outlook.office365.com`)

### Browser Support

- Chrome (Chromium-based browsers)
- Edge
- Firefox

### AI Model Requirements

The extension requires Chrome's built-in Prompt API (Gemini Nano), which:
- Runs entirely on-device (no data sent to external servers)
- Requires Chrome 126+ for optimal performance
- May need to download the model on first use
- Works offline after initial setup

## Development

### Project Structure

```
billing-ext/
├── components/          # Vue components
│   ├── atoms/          # Basic UI components
│   ├── molecules/      # Composite components
│   └── organisms/     # Complex components
├── domain/             # Domain logic (Event Sourcing)
│   ├── bill/          # Bill aggregate
│   └── common/        # Shared domain entities
├── entrypoints/        # Extension entry points
│   ├── background.ts  # Background service worker
│   ├── content.ts     # Content script (injected into emails)
│   └── popup/         # Extension popup UI
├── services/           # Application services
│   ├── billService.ts      # Bill management
│   ├── database.ts        # IndexedDB wrapper
│   └── promptApiService.ts # AI extraction service
└── stores/             # State management
    └── eventStore.ts   # Event store for domain events
```

### Available Scripts

- `npm run dev` - Start development server (Chrome)
- `npm run dev:firefox` - Start development server (Firefox)
- `npm run build` - Build for production (Chrome)
- `npm run build:firefox` - Build for production (Firefox)
- `npm run zip` - Create zip file for Chrome Web Store
- `npm run zip:firefox` - Create zip file for Firefox Add-ons
- `npm run compile` - Type-check TypeScript

### Permissions

The extension requires the following permissions:
- `activeTab` - Access current tab content
- `storage` - Store bills locally
- `scripting` - Inject content scripts
- `tabs` - Communicate with email tabs
- `contextMenus` - Create right-click menu

## Troubleshooting

### AI Extraction Not Working

- Ensure you're using Chrome 126+ or Edge 126+
- Check that the Prompt API is available (extension will log availability status)
- The model may need to download on first use - wait for the download to complete
- Try selecting more text that contains bill information

### Bills Not Appearing

- Refresh the extension popup
- Check the browser console for errors
- Ensure you've successfully created a bill (check for confirmation)

### Export Issues

- Ensure at least one bill is selected (Export button will be disabled otherwise)
- Check browser download settings aren't blocking file downloads
- Verify the CSV file opens correctly in your accounting software

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- Vue components use Composition API
- Domain logic follows event sourcing patterns
- Tests are included for new features (if applicable)

## Support

For issues or questions, please check:
- Browser console for error messages
- Extension logs (background script and content script)
- GitHub issues (if applicable)

