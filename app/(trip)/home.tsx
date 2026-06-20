import { Redirect } from 'expo-router'

// This screen is never rendered — the tab button in _layout.tsx
// intercepts the press and calls router.replace('/') directly.
export default function HomeTab() {
  return <Redirect href="/" />
}
