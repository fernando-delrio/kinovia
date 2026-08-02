import { createContext, useContext } from 'react'
import { useAuthSession } from '../hooks/useAuthSession'

const AuthSessionContext = createContext(null)

export const AuthSessionProvider = ({ children }) => {
  const session = useAuthSession()
  return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>
}

export const useAuthSessionContext = () => {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSessionContext debe usarse dentro de un AuthSessionProvider')
  return context
}
