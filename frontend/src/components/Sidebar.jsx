import { NavLink } from "react-router-dom"
import { LayoutDashboard, Users, Settings, Zap } from "lucide-react"

const links = [
  { to: "/",         icon: LayoutDashboard, label: "Dashboard" },
  { to: "/leads",    icon: Users,           label: "Leads"     },
  { to: "/settings", icon: Settings,        label: "Settings"  },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="text-indigo-400" size={20} />
          <span className="font-bold text-white text-lg">LeadGen</span>
        </div>
        <p className="text-gray-500 text-xs mt-1">AI Lead System</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs text-center">v1.0.0</p>
      </div>
    </aside>
  )
}