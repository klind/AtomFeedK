import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Import commented out but kept for reference in case you want to re-enable later
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * React Query Provider component
 * This sets up React Query for the application
 */
const QueryProvider = ({ children }) => {
  // Create a query client instance that persists across renders
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1, // Only retry failed queries once
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        staleTime: 30 * 1000, // Data is fresh for 30 seconds
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools have been disabled to prevent ResizeObserver errors */}
      {/* Uncomment the following line to re-enable devtools when needed:
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />}
      */}
    </QueryClientProvider>
  );
};

export default QueryProvider; 