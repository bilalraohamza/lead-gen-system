import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { getLeads, getCategories, updateStatus, deleteLead, deleteLeadsBulk } from "../api/leads"
import Badge from "../components/Badge"
import {
  ExternalLink, MessageSquare, Filter,
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  X, Trash2, ChevronDown, ChevronUp,
  Calendar,
} from "lucide-react"

const SOURCES  = ["all", "reddit", "hackernews", "craigslist", "github"]
const INTENTS  = ["all", "hiring", "maybe", "not_hiring"]
const STATUSES = ["all", "new", "reviewed", "contacted", "closed"]
const DATE_RANGES = [
  { label: "All time",    value: "all"   },
  { label: "Today",       value: "today" },
  { label: "Yesterday",   value: "yesterday" },
  { label: "Last 7 days", value: "week"  },
  { label: "Last 30 days",value: "month" },
]

function scoreColor(score) {
  if (score >= 70) return "text-green-400"
  if (score >= 40) return "text-amber-400"
  return "text-gray-500"
}

function filterByDate(leads, range) {
  if (range === "all") return leads
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const week  = new Date(today); week.setDate(today.getDate() - 7)
  const month = new Date(today); month.setDate(today.getDate() - 30)

  return leads.filter(lead => {
    const d = new Date(lead.collected_at)
    if (range === "today")     return d >= today
    if (range === "yesterday") return d >= yesterday && d < today
    if (range === "week")      return d >= week
    if (range === "month")     return d >= month
    return true
  })
}

function groupLeadsByDate(leads) {
  const groups = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)

  leads.forEach(lead => {
    const d = new Date(lead.collected_at)
    let label
    if (d >= today)     label = "Today"
    else if (d >= yesterday) label = "Yesterday"
    else if (d >= weekAgo)   label = "This Week"
    else                     label = "Older"

    if (!groups[label]) groups[label] = []
    groups[label].push(lead)
  })

  return ["Today", "Yesterday", "This Week", "Older"]
    .filter(l => groups[l])
    .map(l => ({ label: l, leads: groups[l] }))
}

export default function Leads() {
  const [leads,       setLeads]       = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [source,      setSource]      = useState("all")
  const [intent,      setIntent]      = useState("all")
  const [status,      setStatus]      = useState("all")
  const [category,    setCategory]    = useState("all")
  const [dateRange,   setDateRange]   = useState("all")
  const [minScore,    setMinScore]    = useState(0)
  const [search,      setSearch]      = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy,      setSortBy]      = useState("score")
  const [sortDir,     setSortDir]     = useState("desc")
  const [viewMode,    setViewMode]    = useState("grouped")
  const [expanded,    setExpanded]    = useState(null)
  const [selected,    setSelected]    = useState([])
  const [showFilters, setShowFilters] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.categories || []))
  }, [])

  const fetchLeads = useCallback(() => {
    setLoading(true)
    const params = { limit: 200, sort_by: sortBy, sort_dir: sortDir }
    if (source   !== "all") params.source    = source
    if (intent   !== "all") params.intent    = intent
    if (status   !== "all") params.status    = status
    if (category !== "all") params.category  = category
    if (minScore  > 0)      params.min_score = minScore
    if (search)             params.search    = search

    getLeads(params)
      .then(r => setLeads(r.data.leads || []))
      .finally(() => setLoading(false))
  }, [source, intent, status, category, minScore, search, sortBy, sortDir])

  useEffect(() => {
    const timer = window.setTimeout(fetchLeads, 0)
    return () => window.clearTimeout(timer)
  }, [fetchLeads])

  const displayedLeads = filterByDate(leads, dateRange)

  const handleStatusChange = async (id, newStatus, e) => {
    e.stopPropagation()
    await updateStatus(id, newStatus)
    fetchLeads()
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm("Delete this lead?")) return
    await deleteLead(id)
    fetchLeads()
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} selected leads?`)) return
    await deleteLeadsBulk(selected)
    setSelected([])
    fetchLeads()
  }

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])
  }

  const toggleSelectAll = () => {
    if (selected.length === displayedLeads.length) {
      setSelected([])
    } else {
      setSelected(displayedLeads.map(l => l.id))
    }
  }

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortBy(col); setSortDir("desc") }
  }

  const allSelected = displayedLeads.length > 0 && selected.length === displayedLeads.length
  const someSelected = selected.length > 0
  const hasLeads = displayedLeads.length > 0

  const clearAll = () => {
    setSource("all"); setIntent("all"); setStatus("all")
    setCategory("all"); setDateRange("all"); setMinScore(0)
    setSearch(""); setSearchInput("")
    setSortBy("score"); setSortDir("desc")
  }

  const activeCount = [
    source !== "all", intent !== "all", status !== "all",
    category !== "all", dateRange !== "all", minScore > 0, search !== ""
  ].filter(Boolean).length

  const renderSortIcon = col => {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-gray-600" />
    return sortDir === "desc"
      ? <ArrowDown size={12} className="text-indigo-400" />
      : <ArrowUp size={12} className="text-indigo-400" />
  }

  const sel = "bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"

  const renderLeadCard = lead => (
    <div
      key={lead.id}
      className={`bg-gray-900 border rounded-xl p-4 transition-colors cursor-pointer ${
        selected.includes(lead.id)
          ? "border-indigo-500 bg-indigo-950"
          : "border-gray-800 hover:border-gray-700"
      }`}
      onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected.includes(lead.id)}
          onChange={e => toggleSelect(lead.id, e)}
          onClick={e => e.stopPropagation()}
          className="mt-1 accent-indigo-500 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={lead.intent_label} />
            <span className={`text-sm font-bold ${scoreColor(lead.score)}`}>
              {lead.score}
            </span>
            <span className="text-gray-500 text-xs capitalize">{lead.source}</span>
            {lead.budget_text && (
              <span className="text-green-400 text-xs font-medium">{lead.budget_text}</span>
            )}
          </div>
          <p className="text-white font-medium mt-1.5 leading-snug">
            {lead.title}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {lead.specific_service || "General"}
          </p>

          {expanded === lead.id && lead.body && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg">
              <p className="text-gray-300 text-sm leading-relaxed">{lead.body}</p>
              {lead.classification_reason && (
                <p className="text-gray-500 text-xs italic mt-2">
                  AI: {lead.classification_reason}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <select
            value={lead.status}
            onChange={e => handleStatusChange(lead.id, e.target.value, e)}
            className="bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none"
          >
            {["new", "reviewed", "contacted", "closed"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => navigate(`/outreach/${lead.id}`)}
            title="Generate outreach"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <MessageSquare size={15} />
          </button>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink size={15} />
          </a>
          <button
            onClick={e => handleDelete(lead.id, e)}
            title="Delete lead"
            className="text-gray-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Loading..." : `${displayedLeads.length} leads`}
            {activeCount > 0 && (
              <span className="ml-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeCount} filter{activeCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={14} />
              Delete {selected.length} selected
            </button>
          )}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {["grouped", "table"].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {mode === "grouped" ? "By Date" : "Table"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowFilters(f => !f)}
          className="w-full flex items-center justify-between px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter size={14} />
            <span className="text-sm">Filters</span>
            {activeCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          {showFilters
            ? <ChevronUp size={14} />
            : <ChevronDown size={14} />
          }
        </button>

        {showFilters && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
            <form onSubmit={handleSearch} className="relative mt-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search lead titles..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg pl-9 pr-9 py-2.5 focus:outline-none focus:border-indigo-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setSearch("") }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </form>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <select value={source}   onChange={e => setSource(e.target.value)}   className={sel}>
                <option value="all">All Sources</option>
                {SOURCES.filter(s => s !== "all").map(s => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>

              <select value={intent}   onChange={e => setIntent(e.target.value)}   className={sel}>
                <option value="all">All Intents</option>
                {INTENTS.filter(i => i !== "all").map(i => (
                  <option key={i} value={i}>{i.replace("_", " ")}</option>
                ))}
              </select>

              <select value={status}   onChange={e => setStatus(e.target.value)}   className={sel}>
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

              <select value={dateRange} onChange={e => setDateRange(e.target.value)} className={`${sel} flex items-center gap-2`}>
                {DATE_RANGES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm whitespace-nowrap">Min:</span>
                <input
                  type="number" min={0} max={100}
                  value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-xs">Sort:</span>
                {[
                  { col: "score", label: "Score" },
                  { col: "date",  label: "Collected" },
                  { col: "posted_at", label: "Posted" },
                ].map(({ col, label }) => (
                  <button
                    key={col}
                    onClick={() => toggleSort(col)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      sortBy === col
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {label} {renderSortIcon(col)}
                  </button>
                ))}
              </div>

              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 text-xs transition-colors"
                >
                  <X size={12} />
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-950 border border-indigo-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="accent-indigo-500"
            />
            <span className="text-indigo-300 text-sm">
              {selected.length} of {displayedLeads.length} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected([])}
              className="text-indigo-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-red-900 hover:bg-red-800 text-red-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              Delete selected
            </button>
          </div>
        </div>
      )}

      {hasLeads && !someSelected && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            onChange={toggleSelectAll}
            checked={false}
            className="accent-indigo-500"
          />
          <span className="text-gray-600 text-xs">Select all to bulk delete</span>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-500">Loading leads...</div>
      )}

      {!loading && displayedLeads.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No leads found. Try adjusting filters or run the pipeline.
        </div>
      )}

      {!loading && viewMode === "grouped" && (
        <div className="space-y-6">
          {groupLeadsByDate(displayedLeads).map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-white font-semibold text-sm">{group.label}</span>
                <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                  {group.leads.length}
                </span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <div className="space-y-2">
                {group.leads.map(lead => renderLeadCard(lead))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && viewMode === "table" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="accent-indigo-500"
                  />
                </th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Source</th>
                <th
                  className="text-left px-4 py-3 cursor-pointer hover:text-white"
                  onClick={() => toggleSort("score")}
                >
                  <span className="flex items-center gap-1">Score {renderSortIcon("score")}</span>
                </th>
                <th className="text-left px-4 py-3">Intent</th>
                <th className="text-left px-4 py-3">Budget</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {displayedLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(lead.id)}
                      onChange={e => toggleSelect(lead.id, e)}
                      className="accent-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-white truncate" title={lead.title}>{lead.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{lead.specific_service || "General"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{lead.source}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${scoreColor(lead.score)}`}>{lead.score}</span>
                  </td>
                  <td className="px-4 py-3"><Badge label={lead.intent_label} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${lead.budget_text ? "text-green-400 font-medium" : "text-gray-600"}`}>
                      {lead.budget_text || "None"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={e => handleStatusChange(lead.id, e.target.value, e)}
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
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={e => handleDelete(lead.id, e)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
