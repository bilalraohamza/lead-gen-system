import { useEffect, useState } from "react"
import {
  runPipeline, triggerDailySummary,
  getSettings, updateCategories, updateSubreddits,
  updateIncludeKeywords, updateBlacklistKeywords,
  updateCustomUrls, updateAlertScore,
  updateSenderName, updateSenderServices, resetSettings,
} from "../api/leads"
import {
  Play, Bell, Info, Plus, X, Save,
  RefreshCw, Tag, Globe, Search,
  Ban, User, Sliders, Loader2,
} from "lucide-react"

function TagInput({ items, onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState("")

  const handleAdd = () => {
    const val = input.trim()
    if (!val || items.includes(val)) return
    onAdd(val)
    setInput("")
  }

  const handleKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item}
            className="flex items-center gap-1.5 bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-gray-700"
          >
            {item}
            <button
              onClick={() => onRemove(item)}
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-gray-600 text-xs italic">Nothing added yet</span>
        )}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, description, children, onSave, saving }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-800 rounded-lg mt-0.5">
            <Icon size={15} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{description}</p>
          </div>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const [config,     setConfig]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [msg,        setMsg]        = useState("")
  const [msgType,    setMsgType]    = useState("success")
  const [saving,     setSaving]     = useState({})
  const [running,    setRunning]    = useState(false)

  const [categories,  setCategories]  = useState([])
  const [subreddits,  setSubreddits]  = useState([])
  const [includeKws,  setIncludeKws]  = useState([])
  const [blacklistKws, setBlacklistKws] = useState([])
  const [customUrls,  setCustomUrls]  = useState([])
  const [alertScore,  setAlertScore]  = useState(70)
  const [senderName,  setSenderName]  = useState("")
  const [senderSvcs,  setSenderSvcs]  = useState("")

  useEffect(() => {
    getSettings().then(r => {
      const c = r.data
      setConfig(c)
      setCategories(c.service_categories  || [])
      setSubreddits(c.target_subreddits   || [])
      setIncludeKws(c.include_keywords    || [])
      setBlacklistKws(c.blacklist_keywords || [])
      setCustomUrls(c.custom_urls         || [])
      setAlertScore(c.alert_min_score     ?? 70)
      setSenderName(c.sender_name         || "")
      setSenderSvcs(c.sender_services     || "")
      setLoading(false)
    })
  }, [])

  const notify = (text, type = "success") => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(""), 3000)
  }

  const setSavingKey = (key, val) => setSaving(s => ({ ...s, [key]: val }))

  const save = async (key, fn, ...args) => {
    setSavingKey(key, true)
    try {
      await fn(...args)
      notify(`${key} saved successfully.`)
    } catch {
      notify(`Failed to save ${key}.`, "error")
    }
    setSavingKey(key, false)
  }

  const handleRunPipeline = async () => {
    setRunning(true)
    notify("Pipeline running with updated settings...", "info")
    try {
      await runPipeline()
      notify("Pipeline completed successfully.")
    } catch {
      notify("Pipeline failed. Check backend terminal.", "error")
    }
    setRunning(false)
  }

  const handleReset = async () => {
    if (!window.confirm("Reset all settings to defaults?")) return
    await resetSettings()
    window.location.reload()
  }

  const msgColors = {
    success: "bg-green-950 border-green-800 text-green-300",
    error:   "bg-red-950 border-red-800 text-red-300",
    info:    "bg-indigo-950 border-indigo-800 text-indigo-300",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-400" size={24} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure what the system looks for and how it behaves</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Reset Defaults
          </button>
          <button
            onClick={handleRunPipeline}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? "Running..." : "Run Pipeline Now"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`border text-sm px-4 py-3 rounded-lg ${msgColors[msgType]}`}>
          {msg}
        </div>
      )}

      <Section
        icon={Tag}
        title="Service Categories"
        description="What services are you offering? The AI uses these to decide if a lead is relevant to you. Add a new category like 'Video editing' and the system will start finding those leads."
        onSave={() => save("categories", updateCategories, categories)}
        saving={saving["categories"]}
      >
        <TagInput
          items={categories}
          onAdd={v => setCategories(p => [...p, v])}
          onRemove={v => setCategories(p => p.filter(i => i !== v))}
          placeholder="e.g. Video editing, Logo design, WordPress..."
        />
      </Section>

      <Section
        icon={Globe}
        title="Target Subreddits"
        description="Which subreddits should the system monitor? Add any subreddit name without the r/ prefix."
        onSave={() => save("subreddits", updateSubreddits, subreddits)}
        saving={saving["subreddits"]}
      >
        <TagInput
          items={subreddits}
          onAdd={v => setSubreddits(p => [...p, v.replace("r/", "")])}
          onRemove={v => setSubreddits(p => p.filter(i => i !== v))}
          placeholder="e.g. videoediting, filmmakers, graphic_design..."
        />
      </Section>

      <Section
        icon={Search}
        title="Include Keywords"
        description="Posts must contain at least one of these words to pass the pre-filter. Add keywords matching your new categories."
        onSave={() => save("include keywords", updateIncludeKeywords, includeKws)}
        saving={saving["include keywords"]}
      >
        <TagInput
          items={includeKws}
          onAdd={v => setIncludeKws(p => [...p, v])}
          onRemove={v => setIncludeKws(p => p.filter(i => i !== v))}
          placeholder="e.g. video editor, premiere pro, after effects..."
        />
      </Section>

      <Section
        icon={Ban}
        title="Blacklist Keywords"
        description="Posts containing any of these words are immediately rejected before the AI even sees them. Saves API quota."
        onSave={() => save("blacklist keywords", updateBlacklistKeywords, blacklistKws)}
        saving={saving["blacklist keywords"]}
      >
        <TagInput
          items={blacklistKws}
          onAdd={v => setBlacklistKws(p => [...p, v])}
          onRemove={v => setBlacklistKws(p => p.filter(i => i !== v))}
          placeholder="e.g. unpaid, volunteer, $0..."
        />
      </Section>

      <Section
        icon={Globe}
        title="Custom URLs to Scrape"
        description="Add any public webpage URL and the system will try to extract leads from it on every pipeline run. Works best with pages that list jobs or requests."
        onSave={() => save("custom URLs", updateCustomUrls, customUrls)}
        saving={saving["custom URLs"]}
      >
        <TagInput
          items={customUrls}
          onAdd={v => setCustomUrls(p => [...p, v])}
          onRemove={v => setCustomUrls(p => p.filter(i => i !== v))}
          placeholder="e.g. https://example.com/jobs..."
        />
        <p className="text-gray-600 text-xs">
          Note: Pages that require login or load content via JavaScript may not work.
        </p>
      </Section>

      <Section
        icon={User}
        title="Sender Profile"
        description="Your name and services are injected into every outreach message generated by the AI."
      >
        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Your Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                placeholder="Your name"
              />
              <button
                onClick={() => save("sender name", updateSenderName, senderName)}
                disabled={saving["sender name"]}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
              >
                {saving["sender name"] ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Services Description (used in outreach messages)</label>
            <div className="flex gap-2">
              <textarea
                value={senderSvcs}
                onChange={e => setSenderSvcs(e.target.value)}
                rows={3}
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="e.g. Python automation, AI integrations, web scraping..."
              />
              <button
                onClick={() => save("sender services", updateSenderServices, senderSvcs)}
                disabled={saving["sender services"]}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm self-start transition-colors"
              >
                {saving["sender services"] ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        icon={Sliders}
        title="Alert Settings"
        description="Instant Telegram alerts fire when a lead scores above this threshold."
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-gray-400 text-sm">Minimum score for instant alert:</label>
            <input
              type="number"
              min={0} max={100}
              value={alertScore}
              onChange={e => setAlertScore(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 w-20 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => save("alert score", updateAlertScore, alertScore)}
            disabled={saving["alert score"]}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            {saving["alert score"] ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
        <p className="text-gray-600 text-xs">
          Current threshold: leads scoring {alertScore} or above trigger an instant Telegram message.
        </p>
      </Section>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Bell size={15} className="text-indigo-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium mb-3">Pipeline Controls</p>
            <div className="flex gap-3">
              <button
                onClick={handleRunPipeline}
                disabled={running}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {running ? "Running..." : "Run Pipeline Now"}
              </button>
              <button
                onClick={async () => {
                  await triggerDailySummary()
                  notify("Daily summary sent to Telegram.")
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                <Bell size={14} />
                Send Telegram Summary
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info size={15} className="text-gray-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">How category changes work</p>
            <p className="text-gray-400 text-sm">
              When you add a new service category like "Video editing", you also need to add matching keywords to Include Keywords (like "video editor", "premiere pro", "after effects"). The keywords control what gets collected. The categories tell the AI what to classify as relevant. Both need to match for the system to find those leads.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}