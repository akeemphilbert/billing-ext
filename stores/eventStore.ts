import { ref, computed } from 'vue';
import { DomainEvent } from '../domain/common/DomainEvent';
import { db } from '../services/database';

export const useEventStore = () => {
  const isInitialized = ref(false);

  /**
   * Initialize the event store
   */
  const initialize = async (): Promise<void> => {
    if (isInitialized.value) return;

    try {
      // Dexie database is automatically initialized
      isInitialized.value = true;
    } catch (error) {
      console.error('Failed to initialize event store:', error);
      isInitialized.value = true;
    }
  };

  /**
   * Append a new event to the store
   * @param event The domain event to append
   */
  const appendEvent = async (event: DomainEvent): Promise<void> => {
    // Add event to unified events table
    await db.events.add(event);
    
    // Update appropriate projection based on event type
    if (event.type.startsWith('bill.')) {
      await db.updateBillProjection(event);
    } else if (event.type.startsWith('vendor.')) {
      await db.updateVendorProjection(event);
    } else if (event.type.startsWith('account.')) {
      await db.updateAccountProjection(event);
    }
  };

  /**
   * Append multiple events to the store
   * @param newEvents Array of domain events to append
   */
  const appendEvents = async (newEvents: DomainEvent[]): Promise<void> => {
    try {
      if (newEvents.length === 0) {
        console.warn('No events to append');
        return;
      }

      // Add all events to unified events table
      console.log('Appending events to store:', newEvents);
      await db.events.bulkAdd(newEvents);
      console.log('Events added to store successfully');
      
      // Update projections based on event type
      for (const event of newEvents) {
        if (event.type.startsWith('bill.')) {
          await db.updateBillProjection(event);
        } else if (event.type.startsWith('vendor.')) {
          await db.updateVendorProjection(event);
        } else if (event.type.startsWith('account.')) {
          await db.updateAccountProjection(event);
        }
      }
      console.log('Projections updated successfully');
    } catch (error) {
      console.error('Error appending events:', error);
      throw error;
    }
  };

  /**
   * Get all events for a specific aggregate
   * @param aggregateId The aggregate ID to filter by
   * @returns Array of events for the aggregate
   */
  const getEventsByAggregateId = async (aggregateId: string): Promise<DomainEvent[]> => {
    const events = await db.events.where('aggregateId').equals(aggregateId).toArray();
    return events.sort((a, b) => a.sequenceNo - b.sequenceNo);
  };

  /**
   * Get all events
   * @returns Array of all events
   */
  const getAllEvents = async (): Promise<DomainEvent[]> => {
    const events = await db.events.toArray();
    return events.sort((a, b) => a.timestamp - b.timestamp);
  };

  /**
   * Get events of a specific type
   * @param eventType The type of events to filter by
   * @returns Array of events of the specified type
   */
  const getEventsByType = async (eventType: string): Promise<DomainEvent[]> => {
    return await db.events.where('type').equals(eventType).toArray();
  };

  /**
   * Get the latest event for a specific aggregate
   * @param aggregateId The aggregate ID
   * @returns The latest event or null if none found
   */
  const getLatestEventForAggregate = async (aggregateId: string): Promise<DomainEvent | null> => {
    const events = await getEventsByAggregateId(aggregateId);
    if (events.length === 0) return null;
    
    return events.reduce((latest, current) => 
      current.sequenceNo > latest.sequenceNo ? current : latest
    );
  };

  /**
   * Clear all events (useful for testing or reset)
   */
  const clearEvents = async (): Promise<void> => {
    await db.events.clear();
  };

  /**
   * Get event count
   */
  const getEventCount = async (): Promise<number> => {
    return await db.events.count();
  };

  /**
   * Check if events table is empty
   */
  const isEmpty = async (): Promise<boolean> => {
    const count = await getEventCount();
    return count === 0;
  };

  return {
    // State
    isInitialized: computed(() => isInitialized.value),
    
    // Actions
    initialize,
    appendEvent,
    appendEvents,
    getEventsByAggregateId,
    getAllEvents,
    getEventsByType,
    getLatestEventForAggregate,
    clearEvents,
    getEventCount,
    isEmpty,
  };
};
