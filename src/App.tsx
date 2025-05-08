import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import theme from './theme'
import Results from './pages/Results'

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={<Results />}
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  )
}

export default App
