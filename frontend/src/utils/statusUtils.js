export const getStatusColor = (status) => {
  switch (status) {
    case 'new':
      return '#3b82f6'; // blue
    case 'in_progress':
      return '#eab308'; // yellow
    case 'completed':
      return '#22c55e'; // green
    case 'failed':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}; 