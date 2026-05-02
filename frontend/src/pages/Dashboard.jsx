import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getStats, getLeads, runPipeline, triggerDailySummary, getPipelineStatus } from "../api/leads"
import StatCard from "../components/StatCard"
import Badge from "../components/Badge"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"
import {
  Users, TrendingUp, Send, Star,
  Play, Bell, Loader2
} from "lucide-react"

export default function Dashboard() {
  const [stats,   setStats]   = useState({})
  const [leads,   setLeads]   = useState([])
  const [running, setRunning] = useState(false)
  const [msg,     setMsg]     = useState("")
  const [msgType, setMsgType] = useState("info")
  const navigate = useNavigate()

  const fetchData = useCallback(() => {
    getStats().then(r => setStats(r.data)).catch(() => {})
    getLeads({ limit: 5, min_score: 0 }).then(r => setLeads(r.data.leads || [])).catch(() => {})
  }, [])

  const notify = useCallback((text, type = "info") => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(""), 5000)
  }, [])

  const startPolling = useCallback(() => {
    if (window._pipelinePoll) clearInterval(window._pipelinePoll)

    let pollCount = 0
    window._pipelinePoll = setInterval(async () => {
      pollCount += 1
      try {
        const statusRes = await getPipelineStatus()
        fetchData()

        if (!statusRes.data.running) {
          clearInterval(window._pipelinePoll)
          window._pipelinePoll = null
          setRunning(false)
          notify("Pipeline completed.", "success")
        }
      } catch {
        // ignore polling errors
      }

      if (pollCount > 90) {
        clearInterval(window._pipelinePoll)
        window._pipelinePoll = null
        setRunning(false)
      }
    }, 4000)
  }, [fetchData, notify])

  useEffect(() => {
    fetchData()

    getPipelineStatus()
      .then(r => {
        if (r.data.running) {
          setRunning(true)
          notify("Pipeline is running in background...", "info")
          startPolling()
        }
      })
      .catch(() => {})

    return () => {
      if (window._pipelinePoll) {
        clearInterval(window._pipelinePoll)
        window._pipelinePoll = null
      }
    }
  }, [fetchData, notify, startPolling])

  const handleRunPipeline = async () => {
    setRunning(true)
    notify("Pipeline started. Leads will appear as they are classified...", "info")

    try {
      await runPipeline()
      startPolling()
    } catch {
      notify("Failed to start pipeline.", "error")
      setRunning(false)
    }
  }

  const handleDailySummary = async () => {
    try {
      await triggerDailySummary()
      notify("Daily summary sent to Telegram.", "success")
    } catch {
      notify("Failed to send summary.", "error")
    }
  }

  const chartData = [
    { name: "Total",     value: stats.total_leads || 0, color: "#6366f1" },
    { name: "Hiring",    value: stats.high_intent  || 0, color: "#22c55e" },
    { name: "Contacted", value: stats.contacted    || 0, color: "#f59e0b" },
    { name: "Today",     value: stats.new_today    || 0, color: "#3b82f6" },
  ]

  const msgColors = {
    info:    "bg-indigo-950 border-indigo-800 text-indigo-300",
    success: "bg-green-950 border-green-800 text-green-300",
    error:   "bg-red-950 border-red-800 text-red-300",
  }

  const scoreBg = (score) => {
    if (score >= 70) return "bg-green-900 text-green-300"
    if (score >= 40) return "bg-amber-900 text-amber-300"
    return "bg-gray-700 text-gray-400"
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Your lead generation overview</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDailySummary}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            <Bell size={15} />
            Send Summary
          </button>
          <button
            onClick={handleRunPipeline}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            {running
              ? <Loader2 size={15} className="animate-spin" />
              : <Play size={15} />
            }
            {running ? "Running..." : "Run Pipeline"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`border text-sm px-4 py-3 rounded-lg ${msgColors[msgType]}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Leads"  value={stats.total_leads} icon={Users}       color="text-indigo-400" />
        <StatCard label="High Intent"  value={stats.high_intent} icon={TrendingUp}  color="text-green-400"  />
        <StatCard label="Contacted"    value={stats.contacted}   icon={Send}        color="text-amber-400"  />
        <StatCard label="New Today"    value={stats.new_today}   icon={Star}        color="text-blue-400"   />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Lead Overview</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={36}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#f9fafb" }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Recent Leads</h2>
          <div className="space-y-2">
            {leads.length === 0 && (
              <p className="text-gray-500 text-sm">No leads yet. Run the pipeline first.</p>
            )}
            {leads.map(lead => (
              <div
                key={lead.id}
                onClick={() => navigate(`/outreach/${lead.id}`)}
                className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-white text-sm truncate group-hover:text-indigo-300 transition-colors">
                    {lead.title}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 capitalize">{lead.source}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge label={lead.intent_label} />
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreBg(lead.score)}`}>
                    {lead.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
