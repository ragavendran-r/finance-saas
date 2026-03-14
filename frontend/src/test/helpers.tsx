import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MemoryRouterProps } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../hooks/useAuth'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

interface WrapperOptions {
  routerProps?: MemoryRouterProps
  queryClient?: QueryClient
  withAuth?: boolean
}

export function renderWithProviders(
  ui: React.ReactElement,
  { routerProps, queryClient, withAuth = true }: WrapperOptions = {},
  renderOptions?: Omit<RenderOptions, 'wrapper'>
) {
  const qc = queryClient ?? createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    const inner = withAuth ? <AuthProvider>{children}</AuthProvider> : <>{children}</>
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter {...routerProps}>{inner}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
