import { createContext, useContext, useRef, type ReactNode } from 'react'
import { DropRegistry } from './DropRegistry'

const Ctx = createContext<DropRegistry | null>(null)

export function DropRegistryProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<DropRegistry>(null)
  if (!registryRef.current) registryRef.current = new DropRegistry()
  return <Ctx.Provider value={registryRef.current}>{children}</Ctx.Provider>
}

export function useDropRegistry(): DropRegistry {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDropRegistry must be used within DropRegistryProvider')
  return ctx
}
