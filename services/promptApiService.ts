/**
 * Prompt API Service
 * Integrates with Chrome's built-in Prompt API (Gemini Nano) for bill extraction
 */

interface BillExtractionResult {
  billNo: string;
  supplier: string;
  billDate: string;
  dueDate: string;
  terms?: string;
  location?: string;
  memo?: string;
  account: string;
  lineDescription: string;
  lineAmount: number;
  currency?: string;
  confidence: number;
}

interface VendorInfo {
  name: string;
}

interface AccountInfo {
  code: string;
  name: string;
}

interface ValidationResult {
  isValid: boolean;
  missingFields: MissingFieldInfo[];
}

interface MissingFieldInfo {
  fieldName: string;
  displayLabel: string;
  fieldType: 'text' | 'date' | 'number';
}

class PromptApiService {
  private session: any | null = null; // LanguageModelSession
  private modelAvailability: 'readily' | 'after-download' | 'downloading' | 'no' | 'unknown' = 'unknown';

  /**
   * Initialize the service and check model availability
   */
  async initialize(): Promise<void> {
    console.log('🚀 PromptApiService initialize() called');
    try {
      // Check if we're in a context where the Prompt API is available
      if (typeof window === 'undefined') {
        console.warn('Prompt API not available in background context');
        return;
      }

      // Check if the Prompt API is available
      console.log('Checking Prompt API availability...');
      console.log('LanguageModel exists:', typeof LanguageModel !== 'undefined');
      
      if (typeof LanguageModel === 'undefined') {
        console.warn('Prompt API not available - LanguageModel not found');
        return;
      }

      const availability = await LanguageModel.availability();
      this.modelAvailability = availability;
      
      switch (availability) {
        case 'readily':
          console.log('✅ Prompt API ready - Model available');
          break;
        case 'after-download':
          console.log('📥 Prompt API needs download - Model not yet available');
          break;
        case 'downloading':
          console.log('⏳ Prompt API downloading - Model in progress');
          break;
        case 'no':
          console.log('❌ Prompt API unavailable - Model not supported');
          break;
      }
    } catch (error) {
      console.error('Failed to initialize Prompt API:', error);
    }
  }

  /**
   * Check if the model is ready to use
   */
  async isModelReady(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    if (this.modelAvailability === 'unknown') {
      await this.initialize();
    }
    return this.modelAvailability === 'readily';
  }

  /**
   * Create a session for extracting bill data
   */
  async createSession(vendors?: VendorInfo[], accounts?: AccountInfo[]): Promise<any> {
    let systemContent = `You are a bill extraction assistant. Your task is to extract structured bill information from text provided by the user.

When given text from an email or document, extract the following fields:
- billNo: Bill or invoice number
- supplier: Name of the vendor/supplier
- billDate: Date of the bill (format: YYYY-MM-DD)
- dueDate: Due date (format: YYYY-MM-DD)
- terms: Payment terms (e.g., Net 15, Net 30)
- location: Location if mentioned
- memo: Any notes or memo
- account: Expense account category
- lineDescription: Description of the line item
- lineAmount: Amount as a number
- currency: Currency code (USD, EUR, GBP, etc.)

For each field, also provide a CSS selector (or XPath if more appropriate) that could be used to extract that value from a web page. If no suitable selector exists, use an empty string.`;

    // Add vendor matching instructions if vendors are provided
    if (vendors && vendors.length > 0) {
      const vendorList = vendors.map(v => v.name).join(', ');
      systemContent += `\n\nEXISTING VENDORS/SUPPLIERS:
The following vendors already exist in the system:
${vendorList}

IMPORTANT: When extracting the supplier name, try to match it to one of these existing vendors. Use fuzzy matching:
- Match the extracted supplier name to the closest existing vendor name (handling variations, abbreviations, etc.)
- If there's a good match (high confidence), use the EXACT existing vendor name from the list above
- If there's no match or the match confidence is low, use the extracted supplier name as-is (a new vendor will be created)

For example:
- If text says "Acme Corp" and existing vendors include "Acme Corporation", match to "Acme Corporation"
- If text says "John's Supplies" and no close match exists, use "John's Supplies" as-is`;
    }

    // Add account matching instructions if accounts are provided
    if (accounts && accounts.length > 0) {
      const accountList = accounts.map(a => `${a.code} (${a.name})`).join(', ');
      systemContent += `\n\nEXISTING ACCOUNTS:
The following accounts already exist in the system:
${accountList}

IMPORTANT: When extracting the account, try to match it to one of these existing accounts:
- Match the extracted account name/code to the closest existing account (by code or name)
- If there's a good match (high confidence), use the EXACT account CODE from the list above
- If there's no match or the match confidence is low, use the extracted account as-is (a new account will be created)

For example:
- If text says "Office Expenses" and existing accounts include "6001 (Office Expenses)", use "6001"
- If text says "New Category" and no close match exists, use "New Category" as-is`;
    }

    systemContent += `\n\nReturn your response as a JSON object matching the schema provided, including both the field values and their corresponding selectors.`;

    const session = await LanguageModel.create({
      initialPrompts: [
        {
          role: "system",
          content: systemContent
        }
      ]
    });
    
    this.session = session;
    return session;
  }

  /**
   * Extract bill data from highlighted text
   */
  async extractBillData(
    text: string, 
    vendors?: VendorInfo[], 
    accounts?: AccountInfo[]
  ): Promise<BillExtractionResult> {
    // Always create a new session with current vendors/accounts to ensure fresh context
    // This ensures the AI has the latest vendor and account lists
    this.session = null;
    await this.createSession(vendors, accounts);

    if (!this.session) {
      throw new Error('Failed to create Prompt API session');
    }

    let prompt = `Extract bill information from the following text:\n\n${text}\n\n`;

    if (vendors && vendors.length > 0) {
      prompt += `Remember to match the supplier to existing vendors if possible: ${vendors.map(v => v.name).join(', ')}\n\n`;
    }

    if (accounts && accounts.length > 0) {
      prompt += `Remember to match the account to existing accounts if possible (use the CODE): ${accounts.map(a => `${a.code} (${a.name})`).join(', ')}\n\n`;
    }

    prompt += `Return the result as JSON. For each field in the schema, include both the extracted value and a selector that could be used to extract that value from a web page (CSS selector or XPath). If no suitable selector exists for a field, use an empty string for that selector.`;

    try {
      const schema = {
        "type": "object",
        "properties": {
          "billNo": { "type": "string", "selector": "" },
          "supplier": { "type": "string", "selector": "" },
          "billDate": { "type": "string", "selector": "" },
          "dueDate": { "type": "string", "selector": "" },
          "terms": { "type": "string", "selector": "" },
          "location": { "type": "string", "selector": "" },
          "memo": { "type": "string", "selector": "" },
          "account": { "type": "string", "selector": "" },
          "lineDescription": { "type": "string", "selector": "" },
          "lineAmount": { "type": "number", "selector": "" },
          "currency": { "type": "string", "selector": "" },
          "confidence": { "type": "number", "selector": "" }
        },
        "required": ["billNo", "supplier", "billDate", "dueDate", "account", "lineDescription", "lineAmount", "confidence"]
      };

      console.log('📤 Sending extraction prompt:', prompt);
      const response = await this.session.prompt(prompt, {
        responseConstraint: schema
      });
      
      console.log('📥 Received response:', response);
      const result = JSON.parse(response);
      
      return result as BillExtractionResult;
    } catch (error) {
      console.error('❌ Failed to extract bill data:', error);
      throw error;
    }
  }

  /**
   * Validate that all required fields are present and valid
   */
  validateRequiredFields(data: Partial<BillExtractionResult>): ValidationResult {
    const missingFields: MissingFieldInfo[] = [];

    // Check supplier
    if (!data.supplier || data.supplier.trim() === '') {
      missingFields.push({
        fieldName: 'supplier',
        displayLabel: 'Supplier',
        fieldType: 'text'
      });
    }

    // Check billDate
    if (!data.billDate || data.billDate.trim() === '') {
      missingFields.push({
        fieldName: 'billDate',
        displayLabel: 'Bill Date',
        fieldType: 'date'
      });
    }

    // Check dueDate
    if (!data.dueDate || data.dueDate.trim() === '') {
      missingFields.push({
        fieldName: 'dueDate',
        displayLabel: 'Due Date',
        fieldType: 'date'
      });
    }

    // Check account
    if (!data.account || data.account.trim() === '') {
      missingFields.push({
        fieldName: 'account',
        displayLabel: 'Account',
        fieldType: 'text'
      });
    }

    // Check lineAmount
    if (data.lineAmount === undefined || data.lineAmount === null || data.lineAmount <= 0) {
      missingFields.push({
        fieldName: 'lineAmount',
        displayLabel: 'Line Amount',
        fieldType: 'number'
      });
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Clean up session
   */
  private cleanupSession(): void {
    if (this.session) {
      try {
        this.session.destroy();
        this.session = null;
      } catch (error) {
        console.warn('Failed to destroy session:', error);
      }
    }
  }

  /**
   * Initialize periodic cleanup
   */
  startCleanupTimer(): void {
    // Clean up session every 30 minutes
    setInterval(() => {
      this.cleanupSession();
    }, 30 * 60 * 1000);
  }
}

export const promptApiService = new PromptApiService();

export type { BillExtractionResult, MissingFieldInfo, ValidationResult };

