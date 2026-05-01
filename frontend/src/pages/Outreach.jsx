import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getLeads, updateStatus } from "../api/leads"
import Badge from "../components/Badge"
import { ExternalLink, MessageSquare, Filter } from "lucide-react"

const SOURCES  = ["all", "reddit", "hackernews", "craigslist", "github"]
const INTENTS  = ["all", "hiring", "maybe", "not_hiring"]
const STATUSES = ["all", "new", "reviewed", "contacted", "closed"]

function scoreColor(score) {
  if (score >= 70) return "text-green-400"
  if (score >= 40) return "text-amber-400"
  return "text-gray-500"
}

export default function Leads() {
  const [leads,    setLeads]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [source,   setSource]   = useState("all")
  const [intent,   setIntent]   = useState("all")
  const [status,   setStatus]   = useState("all")
  const [minScore, setMinScore] = useState(0)
  const navigate = useNavigate()

  const fetchLeads = () => {
    setLoading(true)
    const params = { limit: 100 }
    if (source  !== "all") params.source    = source
    if (intent  !== "all") params.intent    = intent
    if (status  !== "all") params.status    = status
    if (minScore > 0)      params.min_score = minScore
    getLeads(params)
      .then(r => setLeads(r.data.leads || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLeads() }, [source, intent, status, minScore])

  const handleStatusChange = async (id, newStatus) => {
    await updateStatus(id, newStatus)
    fetchLeads()
  }

  const sel = "bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">{leads.length} leads found</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={15} className="text-gray-500" />
          <select value={source}   onChange={e => setSource(e.target.value)}   className={sel}>
            {SOURCES.map(s  => <option key={s} value={s}>{s === "all" ? "All Sources"  : s}</option>)}
          </select>
          <select value={intent}   onChange={e => setIntent(e.target.value)}   className={sel}>
            {INTENTS.map(i  => <option key={i} value={i}>{i === "all" ? "All Intents"  : i}</option>)}
          </select>
          <select value={status}   onChange={e => setStatus(e.target.value)}   className={sel}>
            {STATUSES.map(s => <option key={s} value={s}>{s === "all" ? "All Statuses" : s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Min Score:</span>
            <input
              type="number" min={0} max={100}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 w-20 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => { setSource("all"); setIntent("all"); setStatus("all"); setMinScore(0) }}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Intent</th>
              <th className="text-left px-4 py-3">Budget</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">Loading leads...</td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">No leads found. Try adjusting filters.</td>
              </tr>
            )}
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-white truncate" title={lead.title}>{lead.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{lead.specific_service || "General"}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-400 capitalize">{lead.source}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${scoreColor(lead.score)}`}>
                    {lead.score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge label={lead.intent_label} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-400 text-xs">
                    {lead.budget_text || "Not mentioned"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={lead.status}
                    onChange={e => handleStatusChange(lead.id, e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none"
                  >
                    {["new", "reviewed", "contacted", "closed"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/outreach/${lead.id}`)}
                      title="Generate outreach message"
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <MessageSquare size={15} />
                    </button>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open original post"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
