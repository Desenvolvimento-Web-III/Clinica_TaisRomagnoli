// Scheduling data models for Clinica Tais Romagnoli
// ---------------------------------------------------
// This file defines TypeScript interfaces that represent the Firestore schema
// for blocking periods, recurring schedules and administrative reservations.
// It is placed in the shared package so it can be reused by the web app,
// Cloud Functions and any future backend services.

/**
 * Representação agnóstica de carimbo de tempo compatível tanto com strings ISO 8601 (UTC)
 * quanto com objetos Timestamp do Cloud Firestore (Web SDK e Admin SDK).
 */
export type ScheduleTimestamp =
  | string
  | {
      seconds: number;
      nanoseconds: number;
      toDate?: () => Date;
    };

/**
 * Base fields shared by all schedule related documents.
 */
export interface BaseSchedule {
  /** Unique identifier (Firestore document ID). */
  id: string;
  /** Reference to the resource (e.g., professional, room, equipment). */
  resourceId: string;
  /** Human readable title or description. */
  title: string;
  /** Who created the entry – user uid or service account. */
  createdBy: string;
  /** Timestamp when the document was created. */
  createdAt: ScheduleTimestamp;
  /** Timestamp of the last update. */
  updatedAt: ScheduleTimestamp;
}

/**
 * Represents a single, non‑recurring block of time.
 * Example: a one‑off holiday closure or a special appointment.
 */
export interface FixedBlock extends BaseSchedule {
  /** Start of the blocked period (UTC). */
  start: ScheduleTimestamp;
  /** End of the blocked period (UTC). */
  end: ScheduleTimestamp;
  /** Optional flag indicating whether the block is a reservation (true) or a mere block (false). */
  isReservation: boolean;
  /** Optional client identifier when this block is a reservation. */
  clientId?: string;
}

/**
 * Recurrence rule using the iCal RRULE syntax.
 * This keeps storage minimal while allowing complex patterns.
 */
export interface RecurrenceRule {
  /** Frequency: DAILY, WEEKLY, MONTHLY, YEARLY */
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  /** Interval between occurrences (e.g., every 2 weeks). */
  interval?: number;
  /** Days of week for WEEKLY frequency (0 = Sunday … 6 = Saturday). */
  byDay?: number[];
  /** Day of month for MONTHLY frequency (1‑31). */
  byMonthDay?: number[];
  /** ISO‑8601 end date for the series – null means infinite. */
  until?: ScheduleTimestamp;
  /** Count of occurrences – alternative to `until`. */
  count?: number;
}

/**
 * Represents a recurring schedule or block.
 * The rule is stored once and can be expanded on‑demand by the client or a Cloud Function.
 */
export interface RecurringBlock extends BaseSchedule {
  /** The start time of the first occurrence (UTC). */
  start: ScheduleTimestamp;
  /** The end time of a single occurrence (UTC). */
  end: ScheduleTimestamp;
  /** Recurrence rule expressed with RRULE‑compatible fields. */
  rrule: RecurrenceRule;
  /** List of exception dates (UTC timestamps) that cancel a specific occurrence. */
  exceptionDates?: ScheduleTimestamp[];
}

/**
 * Administrative reservations are similar to FixedBlock but are created by staff
 * and may have additional metadata such as a reason code.
 */
export interface AdminReservation extends FixedBlock {
  /** Reason for the admin reservation (e.g., "MAINTENANCE", "TRAINING"). */
  reasonCode: string;
  /** Optional notes visible only to staff. */
  notes?: string;
}

/**
 * Firestore collection layout (illustrative):
 *
 * /resources/{resourceId}/schedule/{scheduleId}
 *   ├─ fixedBlocks (sub‑collection) – documents of type FixedBlock
 *   ├─ recurringBlocks (sub‑collection) – documents of type RecurringBlock
 *   └─ adminReservations (sub‑collection) – documents of type AdminReservation
 *
 * The `resourceId` can be a professional, room, equipment, etc.
 */

export type ScheduleDocument = FixedBlock | RecurringBlock | AdminReservation;
