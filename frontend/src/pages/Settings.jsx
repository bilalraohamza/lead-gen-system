import { useEffect, useState } from "react"
import {
  runPipeline, triggerDailySummary,
  getSettings, updateCategories, updateSubreddits,
  updateIncludeKeywords, updateBlacklistKeywords,
  updateCustomUrls, updateAlertScore,
  updateSenderName, updateSenderServices,
  updateStrictPrefilter,
  resetSettings, getAiSuggestions,
} from "../api/leads"
import {
  Play, Bell, Info, Plus, X, Save,
  RefreshCw, Tag, Globe, Search,
  Ban, User, Sliders, Loader2,
  Sparkles, CheckSquare, Square, Trash2,
} from "lucide-react"

function TagInput({ items, onAdd, onRemove, onReplace, placeholder, category, suggestType, onSave, normalizeItem }) {
  const [input,       setInput]       = useState("")
  const [selected,    setSelected]    = useState([])
  const [suggesting,  setSuggesting]  = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestErr,  setSuggestErr]  = useState("")
  const [saveStatus,  setSaveStatus]  = useState("")

  const cleanItem = value => (normalizeItem ? normalizeItem(value) : value).trim()

  const triggerSave = async (newItems) => {
    if (!onSave) return
    setSaveStatus("saving")
    try {
      await onSave(newItems)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus(""), 2000)
    } catch {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus(""), 3000)
    }
  }

  const handleAdd = async () => {
    const val = cleanItem(input)
    if (!val || items.includes(val)) return
    const newItems = [...items, val]
    onAdd(val)
    setInput("")
    await triggerSave(newItems)
  }

  const handleKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
  }

  const toggleSelect = (item) => {
    setSelected(s =>
      s.includes(item) ? s.filter(i => i !== item) : [...s, item]
    )
  }

  const handleRemove = async (item) => {
    const newItems = items.filter(i => i !== item)
    onRemove(item)
    setSelected(s => s.filter(i => i !== item))
    await triggerSave(newItems)
  }

  const toggleSelectAll = () => {
    setSelected(s => s.length === items.length ? [] : [...items])
  }

  const deleteSelected = async () => {
    if (selected.length === 0) return
    const remaining = items.filter(i => !selected.includes(i))
    onReplace(remaining)
    setSelected([])
    await triggerSave(remaining)
  }

  const handleSuggest = async () => {
    if (!category) {
      setSuggestErr("Set AI Suggestion Context above first.")
      setTimeout(() => setSuggestErr(""), 3000)
      return
    }
    setSuggesting(true)
    setSuggestions([])
    setSuggestErr("")
    try {
      const r = await getAiSuggestions(category, suggestType)
      setSuggestions(r.data.suggestions || [])
    } catch {
      setSuggestErr("AI suggestion failed. Try again.")
    }
    setSuggesting(false)
  }

  const addSuggestion = async (val) => {
    const item = cleanItem(val)
    if (!item || items.includes(item)) {
      setSuggestions(s => s.filter(i => i !== val))
      return
    }
    const newItems = [...items, item]
    onAdd(item)
    setSuggestions(s => s.filter(i => i !== val))
    await triggerSave(newItems)
  }

  const addAllSuggestions = async () => {
    const newOnes = suggestions
      .map(cleanItem)
      .filter((s, index, arr) => s && !items.includes(s) && arr.indexOf(s) === index)
    if (newOnes.length === 0) {
      setSuggestions([])
      return
    }
    const newItems = [...items, ...newOnes]
    onReplace(newItems)
    setSuggestions([])
    await triggerSave(newItems)
  }

  const allSelected = items.length > 0 && selected.length === items.length

  return (
    <div className="space-y-3">
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
        {suggestType && (
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            title="Get AI suggestions based on the current suggestion context"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            {suggesting
              ? <Loader2 size={14} className="animate-spin" />
              : <Sparkles size={14} />
            }
            {suggesting ? "Thinking..." : "AI Suggest"}
          </button>
        )}

        {saveStatus === "saving" && (
          <span className="flex items-center gap-1 text-gray-400 text-xs">
            <Loader2 size={12} className="animate-spin" /> Saving...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1 text-green-400 text-xs">
            Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            Save failed
          </span>
        )}
      </div>

      {suggestErr && (
        <p className="text-red-400 text-xs">{suggestErr}</p>
      )}

      {suggestions.length > 0 && (
        <div className="bg-purple-950 border border-purple-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-purple-300 text-xs font-medium flex items-center gap-1.5">
              <Sparkles size={12} />
              AI Suggestions - click to add instantly
            </p>
            <button
              onClick={addAllSuggestions}
              className="text-xs text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 px-2 py-1 rounded-lg transition-colors"
            >
              Add All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => addSuggestion(s)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                  items.includes(s)
                    ? "border-gray-700 text-gray-600 line-through cursor-not-allowed"
                    : "border-purple-700 text-purple-300 hover:bg-purple-800 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center gap-3 pb-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {allSelected
              ? <CheckSquare size={13} className="text-indigo-400" />
              : <Square size={13} />
            }
            {allSelected ? "Deselect all" : "Select all"}
          </button>

          {selected.length > 0 && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={13} />
              Delete selected ({selected.length})
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item}
            onClick={() => toggleSelect(item)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
              selected.includes(item)
                ? "bg-red-900 border-red-700 text-red-200"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
            }`}
          >
            {selected.includes(item)
              ? <CheckSquare size={11} className="text-red-400" />
              : <Square size={11} className="text-gray-600" />
            }
            {item}
            <button
              onClick={e => { e.stopPropagation(); handleRemove(item) }}
              className="text-gray-500 hover:text-red-400 transition-colors ml-0.5"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-gray-600 text-xs italic">Nothing added yet. Type above and press Enter.</span>
        )}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-800 rounded-lg mt-0.5 shrink-0">
          <Icon size={15} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <p className="text-gray-500 text-xs mt-0.5">{description}</p>
        </div>
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
  const [selectedCategory, setSelectedCategory] = useState("")

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
        description="What services are you offering? The AI uses these to decide if a lead is relevant. Add a category and press Enter to save instantly."
      >
        <TagInput
          items={categories}
          onAdd={v => setCategories(p => [...p, v])}
          onRemove={v => setCategories(p => p.filter(i => i !== v))}
          onReplace={setCategories}
          onSave={updateCategories}
          placeholder="e.g. Video editing, Logo design, WordPress..."
        />
      </Section>

      {/* Category selector for AI suggestions - shown globally above subreddits/keywords */}
      <div className="bg-gray-900 border border-indigo-800 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Sparkles size={15} className="text-purple-400 shrink-0" />
          <span className="text-gray-300 text-sm font-medium">AI Suggestion Context:</span>
          <select
            value={categories.includes(selectedCategory) ? selectedCategory : ""}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select saved category...</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-gray-600 text-xs">or type custom:</span>
          <input
            type="text"
            placeholder="e.g. Shopify development..."
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 w-56 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <p className="text-gray-600 text-xs mt-2 ml-6">
          This context is used when you click AI Suggest on any section below.
          You can type any niche even if it is not saved as a category yet.
        </p>
      </div>

      <Section
        icon={Globe}
        title="Target Subreddits"
        description="Which subreddits to monitor. Type a subreddit name and press Enter to add and save instantly."
      >
        <TagInput
          items={subreddits}
          onAdd={v => setSubreddits(p => [...p, v.replace("r/", "")])}
          onRemove={v => setSubreddits(p => p.filter(i => i !== v))}
          onReplace={setSubreddits}
          onSave={updateSubreddits}
          normalizeItem={v => v.replace(/^r\//i, "")}
          placeholder="e.g. entrepreneur, smallbusiness, forhire..."
          category={selectedCategory}
          suggestType="subreddits"
        />
      </Section>

      <Section
        icon={Search}
        title="Include Keywords"
        description="Posts must contain at least one keyword to reach the AI. Press Enter after typing to save instantly."
      >
        <TagInput
          items={includeKws}
          onAdd={v => setIncludeKws(p => [...p, v])}
          onRemove={v => setIncludeKws(p => p.filter(i => i !== v))}
          onReplace={setIncludeKws}
          onSave={updateIncludeKeywords}
          placeholder="e.g. need video editor, looking for developer..."
          category={selectedCategory}
          suggestType="include_keywords"
        />
      </Section>

      <Section
        icon={Ban}
        title="Blacklist Keywords"
        description="Posts with these words are immediately skipped. Press Enter to save instantly."
      >
        <TagInput
          items={blacklistKws}
          onAdd={v => setBlacklistKws(p => [...p, v])}
          onRemove={v => setBlacklistKws(p => p.filter(i => i !== v))}
          onReplace={setBlacklistKws}
          onSave={updateBlacklistKeywords}
          placeholder="e.g. unpaid, volunteer, for hire..."
          category={selectedCategory}
          suggestType="blacklist_keywords"
        />
      </Section>

      <Section
        icon={Globe}
        title="Custom URLs to Scrape"
        description="Add any public webpage URL. Press Enter to save instantly."
      >
        <TagInput
          items={customUrls}
          onAdd={v => setCustomUrls(p => [...p, v])}
          onRemove={v => setCustomUrls(p => p.filter(i => i !== v))}
          onReplace={setCustomUrls}
          onSave={updateCustomUrls}
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

        <div className="mt-5 border-t border-gray-800 pt-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Pre-filter strictness:</span>
              <button
                onClick={async () => {
                  const current = config?.strict_prefilter ?? false
                  await updateStrictPrefilter(!current)
                  setConfig(c => ({ ...c, strict_prefilter: !current }))
                  notify(`Switched to ${!current ? "strict" : "loose"} mode.`)
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config?.strict_prefilter ? "bg-indigo-600" : "bg-gray-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config?.strict_prefilter ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              <span className="text-gray-400 text-sm">
                {config?.strict_prefilter ? "Strict (saves API)" : "Loose (more accurate)"}
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-3">
            Loose mode is recommended when exploring a new niche. Switch to strict once your keywords are well-tuned.
          </p>
        </div>

        <p className="text-gray-600 text-xs mt-3">
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
