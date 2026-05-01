import { Routes, Route } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/Dashboard"
import Leads from "./pages/Leads"
import Outreach from "./pages/Outreach"
import Settings from "./pages/Settings"

export default function App() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/leads"         element={<Leads />}     />
          <Route path="/outreach/:id"  element={<Outreach />}  />
          <Route path="/settings"      element={<Settings />}  />
        </Routes>
      </main>
    </div>
  )
}