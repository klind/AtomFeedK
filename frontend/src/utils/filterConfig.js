/**
 * Filter configuration options for the frontend
 * These configurations define the available options for each filter type
 * All options are sorted alphabetically as requested
 */

// Feed filter options
export const FEED_OPTIONS = [
  { value: 'empassignment', label: 'Empasssignment' },
  { value: 'empupdate', label: 'Empupdate' },
  { value: 'newhire', label: 'Newhire' },
  { value: 'termination', label: 'Termination' }
];

// Operation filter options
export const OPERATION_OPTIONS = [
  { value: 'insert', label: 'Insert' },
  { value: 'update', label: 'Update' }
];

// Status filter options
export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processed', label: 'Processed' }
];

// Worker filter options
export const WORKER_OPTIONS = [
  { value: 'CWK', label: 'CWK' },
  { value: 'EMP', label: 'EMP' },
  { value: 'PWK', label: 'PWK' }
];

// Default export with all filter configurations
export default {
  FEED_OPTIONS,
  OPERATION_OPTIONS,
  STATUS_OPTIONS,
  WORKER_OPTIONS
}; 