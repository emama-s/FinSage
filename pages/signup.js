import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../supabase/auth'
import { Box, Button, Container, TextField, Typography, Paper, Snackbar, Alert } from '@mui/material'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showEmailAlert, setShowEmailAlert] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { data, error } = await signUp(email, password)
      if (error) throw error
      
      // Show email verification alert
      setShowEmailAlert(true)
      
      // Clear form
      setEmail('')
      setPassword('')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Sign Up
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign Up
            </Button>
          </form>

          <Typography align="center">
            Already have an account?{' '}
            <Link href="/login" passHref>
              <Button color="primary">Log In</Button>
            </Link>
          </Typography>
        </Paper>
      </Box>

      <Snackbar
        open={showEmailAlert}
        autoHideDuration={6000}
        onClose={() => setShowEmailAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowEmailAlert(false)} 
          severity="info" 
          sx={{ width: '100%' }}
        >
          Please check your email for the verification link to complete your registration.
        </Alert>
      </Snackbar>
    </Container>
  )
} 