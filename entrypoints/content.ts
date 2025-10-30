import { promptApiService } from '../services/promptApiService';

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
    browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: any) => void) => {
      if (message.type === 'MARK_AS_BILL') {
        handleMarkAsBill(message.text).then(result => {
          sendResponse({ success: result });
        }).catch(error => {
          console.error('Error handling mark as bill:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Return true to indicate async response
      }
      return false;
    });

    async function handleMarkAsBill(text: string) {
      try {
        console.log('Extracting bill data from text:', text);

        // Show loading overlay
        showLoadingOverlay();

        // Use Prompt API to extract bill data
        let extractedData = await promptApiService.extractBillData(text);

        // Hide loading overlay after extraction
        hideLoadingOverlay();

        // Show confirmation modal with editable fields (allows user to fill in missing fields)
        const confirmedData = await showBillConfirmationModal(extractedData);

        if (!confirmedData) {
          // User cancelled
          return false;
        }

        // Send bill data to background script to save in extension context
        try {
          const response = await browser.runtime.sendMessage({
            type: 'CREATE_BILL',
            billData: {
              billNo: confirmedData.billNo || 'AUTO-' + Date.now(),
              supplier: confirmedData.supplier,
              billDate: confirmedData.billDate,
              dueDate: confirmedData.dueDate,
              account: confirmedData.account || 'Expense',
              lineDescription: confirmedData.lineDescription || '',
              lineAmount: confirmedData.lineAmount,
              terms: confirmedData.terms,
              location: confirmedData.location,
              memo: confirmedData.memo,
              currency: confirmedData.currency,
            }
          }) as { success?: boolean; billId?: string; error?: string };

          if (response && response.success) {
            console.log('Bill created successfully:', response.billId);
            alert('Bill saved successfully!');
          } else {
            console.error('Failed to create bill:', response?.error);
            alert('Failed to save bill: ' + (response?.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error sending message to background:', error);
          alert('Failed to save bill. Please try again.');
        }
        
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
     * Show bill confirmation modal with editable fields
     */
    function showBillConfirmationModal(extractedData: any): Promise<any | null> {
      return new Promise((resolve) => {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'billing-confirmation-modal';
        modal.innerHTML = `
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
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              background: white;
              width: 90%;
              max-width: 600px;
              max-height: 90vh;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              display: flex;
              flex-direction: column;
              overflow: hidden;
            ">
              <!-- Header -->
              <div style="
                padding: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
              ">
                <h2 style="
                  margin: 0;
                  font-size: 1.25rem;
                  font-weight: 600;
                  color: #1f2937;
                ">Review Bill Details</h2>
                <p style="
                  margin: 0.5rem 0 0 0;
                  font-size: 0.875rem;
                  color: #6b7280;
                ">Please review and confirm the extracted bill information. You can edit any field.</p>
              </div>

              <!-- Content -->
              <div style="
                padding: 1.5rem;
                overflow-y: auto;
                flex: 1;
              ">
                <form id="bill-confirmation-form" style="
                  display: grid;
                  gap: 1rem;
                ">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                      <label style="
                        display: block;
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                      ">Supplier <span style="color: #dc4c3e;">*</span></label>
                      <input type="text" id="supplier" value="${extractedData.supplier || ''}" required style="
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 0.9375rem;
                        box-sizing: border-box;
                      " />
                    </div>
                    <div>
                      <label style="
                        display: block;
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                      ">Bill Number</label>
                      <input type="text" id="billNo" value="${extractedData.billNo || ''}" style="
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 0.9375rem;
                        box-sizing: border-box;
                      " />
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                      <label style="
                        display: block;
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                      ">Bill Date <span style="color: #dc4c3e;">*</span></label>
                      <input type="date" id="billDate" value="${extractedData.billDate || ''}" required style="
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 0.9375rem;
                        box-sizing: border-box;
                      " />
                    </div>
                    <div>
                      <label style="
                        display: block;
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                      ">Due Date <span style="color: #dc4c3e;">*</span></label>
                      <input type="date" id="dueDate" value="${extractedData.dueDate || ''}" required style="
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 0.9375rem;
                        box-sizing: border-box;
                      " />
                    </div>
                  </div>

                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 0.5rem;
                      font-size: 0.875rem;
                      font-weight: 500;
                      color: #374151;
                    ">Account <span style="color: #dc4c3e;">*</span></label>
                    <input type="text" id="account" value="${extractedData.account || ''}" required style="
                      width: 100%;
                      padding: 0.625rem 0.75rem;
                      border: 1px solid #d1d5db;
                      border-radius: 6px;
                      font-size: 0.9375rem;
                      box-sizing: border-box;
                    " />
                  </div>

                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 0.5rem;
                      font-size: 0.875rem;
                      font-weight: 500;
                      color: #374151;
                    ">Description</label>
                    <input type="text" id="lineDescription" value="${extractedData.lineDescription || ''}" style="
                      width: 100%;
                      padding: 0.625rem 0.75rem;
                      border: 1px solid #d1d5db;
                      border-radius: 6px;
                      font-size: 0.9375rem;
                      box-sizing: border-box;
                    " />
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                      <label style="
                        display: block;
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                      ">Amount <span style="color: #dc4c3e;">*</span></label>
                      <input type="number" step="0.01" id="lineAmount" value="${extractedData.lineAmount || ''}" required style="
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 0.9375rem;
                        box-sizing: border-box;
                      " />
                    </div>
                    <div>
                      <label style="
                        display: block;
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                      ">Currency</label>
                      <input type="text" id="currency" value="${extractedData.currency || 'USD'}" style="
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 0.9375rem;
                        box-sizing: border-box;
                      " />
                    </div>
                  </div>

                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 0.5rem;
                      font-size: 0.875rem;
                      font-weight: 500;
                      color: #374151;
                    ">Terms</label>
                    <input type="text" id="terms" value="${extractedData.terms || ''}" style="
                      width: 100%;
                      padding: 0.625rem 0.75rem;
                      border: 1px solid #d1d5db;
                      border-radius: 6px;
                      font-size: 0.9375rem;
                      box-sizing: border-box;
                    " />
                  </div>

                  <div>
                    <label style="
                      display: block;
                      margin-bottom: 0.5rem;
                      font-size: 0.875rem;
                      font-weight: 500;
                      color: #374151;
                    ">Memo</label>
                    <textarea id="memo" rows="3" style="
                      width: 100%;
                      padding: 0.625rem 0.75rem;
                      border: 1px solid #d1d5db;
                      border-radius: 6px;
                      font-size: 0.9375rem;
                      box-sizing: border-box;
                      font-family: inherit;
                      resize: vertical;
                    ">${extractedData.memo || ''}</textarea>
                  </div>
                </form>
              </div>

              <!-- Footer -->
              <div style="
                padding: 1.5rem;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
              ">
                <button id="cancel-btn" type="button" style="
                  padding: 0.625rem 1.5rem;
                  background: #ffffff;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  color: #374151;
                  font-size: 0.875rem;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s;
                " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#ffffff'">
                  Cancel
                </button>
                <button id="submit-btn" type="submit" form="bill-confirmation-form" style="
                  padding: 0.625rem 1.5rem;
                  background: #dc4c3e;
                  border: none;
                  border-radius: 6px;
                  color: white;
                  font-size: 0.875rem;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s;
                " onmouseover="this.style.background='#c03f32'" onmouseout="this.style.background='#dc4c3e'">
                  Save Bill
                </button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#bill-confirmation-form') as HTMLFormElement;
        const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;

        // Handle form submission
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const supplier = (form.querySelector('#supplier') as HTMLInputElement).value;
          const billDate = (form.querySelector('#billDate') as HTMLInputElement).value;
          const dueDate = (form.querySelector('#dueDate') as HTMLInputElement).value;
          const account = (form.querySelector('#account') as HTMLInputElement).value;
          const lineAmount = parseFloat((form.querySelector('#lineAmount') as HTMLInputElement).value);

          // Validate required fields
          if (!supplier || !billDate || !dueDate || !account || !lineAmount || lineAmount <= 0) {
            alert('Please fill in all required fields (Supplier, Bill Date, Due Date, Account, and Amount greater than 0).');
            return;
          }

          const formData = {
            billNo: (form.querySelector('#billNo') as HTMLInputElement).value,
            supplier,
            billDate,
            dueDate,
            account,
            lineDescription: (form.querySelector('#lineDescription') as HTMLInputElement).value,
            lineAmount,
            terms: (form.querySelector('#terms') as HTMLInputElement).value,
            location: extractedData.location,
            memo: (form.querySelector('#memo') as HTMLTextAreaElement).value,
            currency: (form.querySelector('#currency') as HTMLInputElement).value,
          };

          modal.remove();
          resolve(formData);
        });

        // Handle cancel
        cancelBtn.addEventListener('click', () => {
          modal.remove();
          resolve(null);
        });

        // Click outside to close - listen on the first child div (overlay)
        const overlay = modal.firstElementChild as HTMLElement;
        overlay.addEventListener('click', (e) => {
          // Only close if clicking directly on the overlay, not on its children
          if (e.target === overlay) {
            modal.remove();
            resolve(null);
          }
        });
      });
    }
  },
});


