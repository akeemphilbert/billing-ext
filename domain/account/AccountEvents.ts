import { DomainEvent, createDomainEvent } from '../common/DomainEvent';
import { Account } from './Account';

// Simple CRUD events for Account domain - KISS approach
// Each event contains the complete domain entity as payload

/**
 * Creates an AccountCreated event
 * @param account The Account entity that was created
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for account creation
 */
export function createAccountCreatedEvent(
  account: Account,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Account> {
  return createDomainEvent('account.created', account, aggregateId, sequenceNo);
}

/**
 * Creates an AccountUpdated event
 * @param account The updated Account entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for account update
 */
export function createAccountUpdatedEvent(
  account: Account,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Account> {
  return createDomainEvent('account.updated', account, aggregateId, sequenceNo);
}

/**
 * Creates an AccountDeleted event
 * @param account The deleted Account entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for account deletion
 */
export function createAccountDeletedEvent(
  account: Account,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Account> {
  return createDomainEvent('account.deleted', account, aggregateId, sequenceNo);
}

