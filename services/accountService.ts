import { Account } from '../domain/account/Account';
import { useEventStore } from '../stores/eventStore';
import { db, type AccountProjection } from './database';
import { v4 as uuidv4 } from 'uuid';

class AccountService {
  private eventStore = useEventStore();

  /**
   * Create a new account
   */
  async createAccount(data: {
    code: string;
    name: string;
    description?: string;
    accountType?: string;
  }): Promise<Account> {
    try {
      const id = uuidv4();
      const account = Account.create(
        id,
        data.code,
        data.name,
        data.description,
        data.accountType
      );

      // Get uncommitted events and store them
      const uncommittedEvents = account.getAllUncommittedEvents();
      console.log('Uncommitted account events:', uncommittedEvents);
      
      if (uncommittedEvents.length > 0) {
        await this.eventStore.appendEvents(uncommittedEvents);
        account.markAllEventsAsCommitted();
        console.log('Account created and saved successfully');
      } else {
        console.warn('No uncommitted events to save');
      }

      return account;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Get all accounts
   */
  async getAllAccounts(): Promise<AccountProjection[]> {
    try {
      await db.open();
      const accounts = await db.getAllAccounts();
      console.log('Retrieved accounts:', accounts.length);
      return accounts;
    } catch (error) {
      console.error('Error getting all accounts:', error);
      throw error;
    }
  }

  /**
   * Get an account by ID
   */
  async getAccountById(id: string): Promise<AccountProjection | undefined> {
    try {
      await db.open();
      return await db.getAccountById(id);
    } catch (error) {
      console.error('Error getting account by ID:', error);
      throw error;
    }
  }

  /**
   * Get an account by code (case-insensitive)
   */
  async getAccountByCode(code: string): Promise<AccountProjection | undefined> {
    try {
      await db.open();
      return await db.getAccountByCode(code);
    } catch (error) {
      console.error('Error getting account by code:', error);
      throw error;
    }
  }

  /**
   * Update an account
   */
  async updateAccount(id: string, updates: {
    code?: string;
    name?: string;
    description?: string;
    accountType?: string;
  }): Promise<void> {
    // Get events for this aggregate
    const events = await this.eventStore.getEventsByAggregateId(id);
    const account = Account.fromEvents(id, events);

    // Update the account
    account.updateMetadata(updates);

    // Store new events
    const uncommittedEvents = account.getAllUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      account.markAllEventsAsCommitted();
    }
  }

  /**
   * Delete an account
   */
  async deleteAccount(id: string): Promise<void> {
    // Get events for this aggregate
    const events = await this.eventStore.getEventsByAggregateId(id);
    const account = Account.fromEvents(id, events);

    // Delete the account
    account.delete();

    // Store the delete event
    const uncommittedEvents = account.getAllUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      await this.eventStore.appendEvents(uncommittedEvents);
      account.markAllEventsAsCommitted();
    }
  }
}

export const accountService = new AccountService();

