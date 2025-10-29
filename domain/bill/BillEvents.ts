import { DomainEvent, createDomainEvent } from '../common/DomainEvent';
import { Bill } from './Bill';

// Simple CRUD events for Bill domain - KISS approach
// Each event contains the complete domain entity as payload

/**
 * Creates a BillCreated event
 * @param bill The Bill entity that was created
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for bill creation
 */
export function createBillCreatedEvent(
  bill: Bill,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Bill> {
  return createDomainEvent('bill.created', bill, aggregateId, sequenceNo);
}

/**
 * Creates a BillUpdated event
 * @param bill The updated Bill entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for bill update
 */
export function createBillUpdatedEvent(
  bill: Bill,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Bill> {
  return createDomainEvent('bill.updated', bill, aggregateId, sequenceNo);
}

/**
 * Creates a BillDeleted event
 * @param bill The deleted Bill entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for bill deletion
 */
export function createBillDeletedEvent(
  bill: Bill,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<Bill> {
  return createDomainEvent('bill.deleted', bill, aggregateId, sequenceNo);
}

