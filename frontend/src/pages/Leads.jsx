import { Fragment, useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCategories, getLeads, updateStatus } from "../api/leads"
import Badge from "../components/Badge"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Filter,
  MessageSquare,
  Search,
  X,
} from "lucide-react"

const SOURCES = ["all", "reddit", "hackernews", "craigslist", "github"]
const INTENTS = ["all", "hiring", "maybe", "not_hiring"]
const STATUSES = ["all", "new", "reviewed", "contacted", "closed"]
const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "date", label: "Collected" },
  { value: "posted_at", label: "Posted" },
]

function scoreColor(score) {
  if (score >= 70) return "text-green-400"
  if (score >= 40) return "text-amber-400"
  return "text-gray-500"
}

function groupLeadsByDate(leads) {
  const groups = {}
  const now = new Date()

  leads.forEach(lead => {
    const collected = new Date(lead.collected_at)
    const diffDays = Math.floor((now - collected) / (1000 * 60 * 60 * 24))

    let label
    if (diffDays === 0) label = "Today"
    else if (diffDays === 1) label = "Yesterday"
    else if (diffDays <= 7) label = "This Week"
    else if (diffDays <= 30) label = "This Month"
    else label = "Older"

    if (!groups[label]) groups[label] = []
    groups[label].push(lead)
  })

  const order = ["Today", "Yesterday", "This Week", "This Month", "Older"]
  return order
    .filter(label => groups[label])
    .map(label => ({ label, leads: groups[label] }))
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState("all")
  const [intent, setIntent] = useState("all")
  const [status, setStatus] = useState("all")
  const [category, setCategory] = useState("all")
  const [minScore, setMinScore] = useState(0)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy, setSortBy] = useState("score")
  const [sortDir, setSortDir] = useState("desc")
  const [expanded, setExpanded] = useState(null)
  const [viewMode, setViewMode] = useState("table")
  const navigate = useNavigate()

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.categories || []))
  }, [])

  const fetchLeads = useCallback(() => {
    setLoading(true)
    const params = { limit: 100, sort_by: sortBy, sort_dir: sortDir }
    if (source !== "all") params.source = source
    if (intent !== "all") params.intent = intent
    if (status !== "all") params.status = status
    if (category !== "all") params.category = category
    if (minScore > 0) params.min_score = minScore
    if (search) params.search = search

    getLeads(params)
      .then(r => setLeads(r.data.leads || []))
      .finally(() => setLoading(false))
  }, [source, intent, status, category, minScore, search, sortBy, sortDir])

  useEffect(() => {
    const timer = window.setTimeout(fetchLeads, 0)
    return () => window.clearTimeout(timer)
  }, [fetchLeads])

  const handleStatusChange = async (id, newStatus) => {
    await updateStatus(id, newStatus)
    fetchLeads()
  }

  const handleSearch = e => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const clearSearch = () => {
    setSearchInput("")
    setSearch("")
  }

  const toggleSort = col => {
    if (sortBy === col) {
      setSortDir(d => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortBy(col)
      setSortDir("desc")
    }
  }

  const clearAllFilters = () => {
    setSource("all")
    setIntent("all")
    setStatus("all")
    setCategory("all")
    setMinScore(0)
    setSearch("")
    setSearchInput("")
    setSortBy("score")
    setSortDir("desc")
  }

  const activeFilterCount = [
    source !== "all",
    intent !== "all",
    status !== "all",
    category !== "all",
    minScore > 0,
    search !== "",
  ].filter(Boolean).length

  const sel = "bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"

  const renderSortIcon = col => {
    if (sortBy !== col) return <ArrowUpDown size={13} className="text-gray-600" />
    if (sortDir === "desc") return <ArrowDown size={13} className="text-indigo-400" />
    return <ArrowUp size={13} className="text-indigo-400" />
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Loading..." : `${leads.length} leads found`}
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("table")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === "table"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode("grouped")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === "grouped"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            By Date
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <form onSubmit={handleSearch} className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search lead titles..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg pl-9 pr-10 py-2.5 focus:outline-none focus:border-indigo-500"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={14} className="text-gray-500 shrink-0" />

          <select value={source} onChange={e => setSource(e.target.value)} className={sel}>
            <option value="all">All Sources</option>
            {SOURCES.filter(s => s !== "all").map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          <select value={intent} onChange={e => setIntent(e.target.value)} className={sel}>
            <option value="all">All Intents</option>
            {INTENTS.filter(i => i !== "all").map(i => (
              <option key={i} value={i}>{i.replace("_", " ")}</option>
            ))}
          </select>

          <select value={status} onChange={e => setStatus(e.target.value)} className={sel}>
            <option value="all">All Statuses</option>
            {STATUSES.filter(s => s !== "all").map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          <select value={category} onChange={e => setCategory(e.target.value)} className={sel}>
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm whitespace-nowrap">Min Score:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 w-20 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-500 text-sm">Sort:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleSort(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === opt.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {opt.label}
                {renderSortIcon(opt.value)}
              </button>
            ))}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 text-sm transition-colors"
            >
              <X size={13} />
              Clear all
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-gray-600 text-xs">Quick:</span>
            <button
              onClick={() => setCategory("all")}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                category === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? "all" : c)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  category === c
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode === "table" && (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Source</th>
              <th
                className="text-left px-4 py-3 cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort("score")}
              >
                <span className="flex items-center gap-1">
                  Score {renderSortIcon("score")}
                </span>
              </th>
              <th className="text-left px-4 py-3">Intent</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Budget</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  Loading leads...
                </td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  No leads found. Try adjusting your filters.
                </td>
              </tr>
            )}
            {leads.map(lead => (
              <Fragment key={lead.id}>
                <tr
                  className="hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                >
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-white truncate" title={lead.title}>{lead.title}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{lead.author}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 capitalize">{lead.source}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-base ${scoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={lead.intent_label} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-xs">
                      {lead.specific_service || "General"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${lead.budget_text ? "text-green-400" : "text-gray-600"}`}>
                      {lead.budget_text || "Not mentioned"}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                {expanded === lead.id && (
                  <tr className="bg-gray-800/40">
                    <td colSpan={8} className="px-4 py-4 border-b border-gray-800">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Post Body</p>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {lead.body || "No body content available."}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">AI Reason</p>
                            <p className="text-gray-300 text-sm italic">{lead.classification_reason || "No reason recorded."}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Contact</p>
                            <p className="text-gray-300 text-sm">{lead.contact_email || lead.author || "Unknown"}</p>
                          </div>
                          <button
                            onClick={() => navigate(`/outreach/${lead.id}`)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
                          >
                            <MessageSquare size={13} />
                            Generate Outreach
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {viewMode === "grouped" && (
        <div className="space-y-6">
          {loading && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
              Loading leads...
            </div>
          )}
          {!loading && leads.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
              No leads found. Try adjusting your filters.
            </div>
          )}
          {!loading && groupLeadsByDate(leads).map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white font-semibold">{group.label}</span>
                <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                  {group.leads.length} leads
                </span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <div className="space-y-2">
                {group.leads.map(lead => (
                  <div
                    key={lead.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge label={lead.intent_label} />
                          <span className={`text-sm font-bold ${scoreColor(lead.score)}`}>
                            {lead.score}
                          </span>
                          <span className="text-gray-600 text-xs capitalize">{lead.source}</span>
                        </div>
                        <p className="text-white font-medium mt-1 truncate">{lead.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {lead.specific_service || "General"}
                          {lead.budget_text && (
                            <span className="text-green-400 ml-2">{lead.budget_text}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none"
                        >
                          {["new", "reviewed", "contacted", "closed"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
