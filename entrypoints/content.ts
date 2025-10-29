import { promptApiService, type MissingFieldInfo } from '../services/promptApiService';
import { billService } from '../services/billService';

export default defineContentScript({
  matches: [
    'https://mail.google.com/*',
    'https://outlook.live.com/*',
    'https://outlook.office.com/*',
    'https://outlook.office365.com/*'
  ],
  
  async main() {
    console.log('Content script loaded on email page');

    // Initialize Prompt API service
    await promptApiService.initialize();
    promptApiService.startCleanupTimer();

    // Loading overlay management
    let loadingOverlay: HTMLElement | null = null;

    function showLoadingOverlay() {
      if (loadingOverlay) return;

      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'billing-ext-loading-overlay';
      loadingOverlay.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
        ">
          <div style="
            background: white;
            padding: 2rem 3rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          ">
            <div style="
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
            <div style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 16px;
              color: #333;
              font-weight: 500;
            ">Processing…</div>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(loadingOverlay);
    }

    function hideLoadingOverlay() {
      if (loadingOverlay) {
        loadingOverlay.remove();
        loadingOverlay = null;
      }
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'MARK_AS_BILL') {
        handleMarkAsBill(message.text).then(result => {
          sendResponse({ success: result });
        }).catch(error => {
          console.error('Error handling mark as bill:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Return true to indicate async response
      }
    });

    async function handleMarkAsBill(text: string) {
      try {
        console.log('Extracting bill data from text:', text);

        // Show loading overlay
        showLoadingOverlay();

        // Use Prompt API to extract bill data
        let extractedData = await promptApiService.extractBillData(text);

        // Validate required fields
        const validation = promptApiService.validateRequiredFields(extractedData);
        
        // Prompt for missing fields
        if (!validation.isValid) {
          console.log('Missing required fields:', validation.missingFields);
          
          // Send message to open popup with missing fields form
          const formData = await showMissingFieldsForm(validation.missingFields, extractedData);
          
          if (!formData) {
            // User cancelled - hide overlay and return
            hideLoadingOverlay();
            return false;
          }
          
          // Update the extracted data with user input from form
          Object.keys(formData).forEach(key => {
            if (key === 'lineAmount') {
              extractedData.lineAmount = Number(formData[key]) || 0;
            } else {
              (extractedData as any)[key] = formData[key];
            }
          });
          
          // Re-validate to ensure all fields are now filled
          const revalidation = promptApiService.validateRequiredFields(extractedData);
          if (!revalidation.isValid) {
            // Hide overlay before showing alert
            hideLoadingOverlay();
            alert('Some required fields are still missing. Please try again.');
            return false;
          }
        }

        // Hide loading overlay after extraction
        hideLoadingOverlay();

        // Show confirmation dialog
        const confirmed = confirm(
          `Extract this bill?\n\n` +
          `Supplier: ${extractedData.supplier}\n` +
          `Amount: ${extractedData.lineAmount} ${extractedData.currency || ''}\n` +
          `Bill Date: ${extractedData.billDate}\n` +
          `Due Date: ${extractedData.dueDate}\n\n` +
          `Click OK to save or Cancel to edit manually.`
        );

        if (!confirmed) {
          // TODO: Open popup with form for manual editing
          return false;
        }

        // Create bill
        const bill = await billService.createBill({
          billNo: extractedData.billNo || 'AUTO-' + Date.now(),
          supplier: extractedData.supplier,
          billDate: new Date(extractedData.billDate),
          dueDate: new Date(extractedData.dueDate),
          account: extractedData.account || 'Expense',
          lineDescription: extractedData.lineDescription,
          lineAmount: extractedData.lineAmount,
          terms: extractedData.terms,
          location: extractedData.location,
          memo: extractedData.memo,
          currency: extractedData.currency,
        });

        console.log('Bill created successfully:', bill);
        
        // Show success notification
        alert('Bill saved successfully!');
        
        return true;
      } catch (error) {
        console.error('Failed to create bill:', error);
        // Hide loading overlay on error
        hideLoadingOverlay();
        alert('Failed to extract bill data. Please try again.');
        return false;
      }
    }

    /**
     * Show missing fields form in popup and wait for response
     */
    function showMissingFieldsForm(
      missingFields: MissingFieldInfo[], 
      extractedData: any
    ): Promise<Record<string, string | number> | null> {
      return new Promise((resolve) => {
        // Store the extraction data for the popup to retrieve
        chrome.storage.local.set({
          pendingBillExtraction: {
            missingFields,
            extractedData,
            timestamp: Date.now(),
          }
        });

        // Show alert asking user to open popup
        const userConfirmed = confirm(
          'Some required fields are missing. Click OK to open the popup and fill them in, or Cancel to skip.'
        );

        if (!userConfirmed) {
          chrome.storage.local.remove('pendingBillExtraction');
          resolve(null);
          return;
        }

        // Try to send message to popup if it's already open
        chrome.runtime.sendMessage({
          type: 'SHOW_MISSING_FIELDS_FORM',
          missingFields,
          extractedData,
        }).catch(() => {
          // Popup might not be open
          console.log('Popup not open, waiting for user to open it...');
        });

        // Listen for response from popup
        const messageListener = (message: any) => {
          if (message.type === 'MISSING_FIELDS_SUBMITTED') {
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.storage.local.remove('pendingBillExtraction');
            resolve(message.data);
          } else if (message.type === 'MISSING_FIELDS_CANCELLED') {
            chrome.runtime.onMessage.removeListener(messageListener);
            chrome.storage.local.remove('pendingBillExtraction');
            resolve(null);
          }
        };

        chrome.runtime.onMessage.addListener(messageListener);
      });
    }
  },
});


