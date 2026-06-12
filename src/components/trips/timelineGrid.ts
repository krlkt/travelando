/**
 * Shared layout for timeline rows: time column | rail node | content.
 * Used by TimelineItem, HotelLegRow, and anything that must align with the
 * rail (e.g. the "Add to this day" button) so the columns never drift apart.
 */
export const timelineGridClass =
  'grid grid-cols-[3.25rem_1.75rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[4rem_2rem_minmax(0,1fr)] sm:gap-x-3';

/** Left margin equal to the time + node columns, aligning with content. */
export const timelineIndentClass = 'ml-[6.25rem] sm:ml-[7.5rem]';
