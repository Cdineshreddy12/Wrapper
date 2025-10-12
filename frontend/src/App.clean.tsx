import React, { Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { ErrorBoundary } from "@/errors/ErrorBoundary"
import { SuspenseFallback } from "@/components/common/SuspenseFallback"
import AppShell from "./components/layout/AppShell"

// Lazy load routes for better performance
const Home = React.lazy(() => import("./routes/Home"))
const Dashboard = React.lazy(() => import("./routes/Dashboard"))

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  )
}
