import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthSessionProvider } from './modules/auth/context/AuthSessionContext'
import { LandingPage } from './modules/marketing/components/LandingPage'
import { SignUpPage } from './modules/auth/components/SignUpPage'
import { LogInPage } from './modules/auth/components/LogInPage'
import { AcceptInvitePage } from './modules/auth/components/AcceptInvitePage'
import { ConsentPage } from './modules/auth/components/ConsentPage'
import { TrainerDashboard } from './modules/trainer/components/TrainerDashboard'
import { ClientDashboard } from './modules/client/components/ClientDashboard'
import { ProtectedRoute } from './modules/core/components/ProtectedRoute'
import { SessionRoute } from './modules/core/components/SessionRoute'

const App = () => (
  <AuthSessionProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LogInPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route element={<SessionRoute />}>
          <Route path="/consent" element={<ConsentPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/trainer" element={<TrainerDashboard />} />
          <Route path="/client" element={<ClientDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthSessionProvider>
)

export default App
