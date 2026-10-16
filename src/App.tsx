import Dashboard from "./pages/Dashboard"
import ToastProvider from "./components/ui/ToastProvider"

function App() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  )
}

export default App
