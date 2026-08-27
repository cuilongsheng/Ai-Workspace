import { AppRouter } from './router/AppRouter'
import { Toast } from '@heroui/react'

export default function App() {
  return (
    <>
      <AppRouter />
      <Toast.Provider
        className="z-[9999]"
        maxVisibleToasts={4}
        placement="top"
      />
    </>
  )
}
