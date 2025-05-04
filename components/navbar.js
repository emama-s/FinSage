import { useRouter } from 'next/router'
import { useAuth } from '../supabase/auth'
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'

export default function NavBar() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          FinSage
        </Typography>
        {user && (
          <Box>
            <Button color="inherit" onClick={handleSignOut}>
              Sign Out
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}