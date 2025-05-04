import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../supabase/auth'
import { Button, Container, Typography, Box } from '@mui/material'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user])

  return (
    <div>
      <Head>
        <title>FinSage - Expense Tracker</title>
        <meta name="description" content="Track your expenses with FinSage" />
      </Head>

      <Container maxWidth="md">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to FinSage
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 4 }}>
            Your Personal Expense Tracker
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
            >
              Log In
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push('/signup')}
            >
              Sign Up
            </Button>
          </Box>
        </Box>
      </Container>
    </div>
  )
}