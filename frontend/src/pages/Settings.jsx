import { useState } from "react"
import { runPipeline, triggerDailySummary } from "../api/leads"
import { Play, Bell, Info } from "lucide-react"

export default function Settings() {
  const [pipelineMsg, setPipelineMsg] = useState("")
  const [summaryMsg,  setSummaryMsg]  = useState("")
  const [running,     setRunning]     = useState(false)

  const handleRunPipeline = async () => {
    setRunning(true)
    setPipelineMsg("Pipeline running...")
    try {
      await runPipeline()
      setPipelineMsg("Pipeline completed successfully.")
    } catch {
      setPipelineMsg("Pipeline failed. Check backend terminal.")
    }
    setRunning(false)
  }

  const handleSummary = async () => {
    try {
      await triggerDailySummary()
      setSummaryMsg("Daily summary sent to Telegram.")
    } catch {
      setSummaryMsg("Failed to send summary.")
    }
  }

  const InfoRow = ({ label, value }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white text-sm font-mono">{value}</span>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">System controls and configuration</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Pipeline Control</h2>

        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
          <div>
            <p className="text-white text-sm font-medium">Run Pipeline Now</p>
            <p className="text-gray-500 text-xs mt-0.5">Collect, filter, score and save leads immediately</p>
          </div>
          <button
            onClick={handleRunPipeline}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            <Play size={14} />
            {running ? "Running..." : "Run"}
          </button>
        </div>
        {pipelineMsg && <p className="text-indigo-400 text-sm">{pipelineMsg}</p>}

        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
          <div>
            <p className="text-white text-sm font-medium">Send Telegram Summary</p>
            <p className="text-gray-500 text-xs mt-0.5">Push top leads to your Telegram right now</p>
          </div>
          <button
            onClick={handleSummary}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            <Bell size={14} />
            Send
          </button>
        </div>
        {summaryMsg && <p className="text-green-400 text-sm">{summaryMsg}</p>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">System Info</h2>
        <InfoRow label="Pipeline Schedule" value="0:00, 6:00, 12:00, 18:00"      />
        <InfoRow label="Morning Summary"   value="8:00 AM daily"                  />
        <InfoRow label="Data Sources"      value="Reddit, HN, Craigslist, GitHub" />
        <InfoRow label="AI Classifier"     value="OpenRouter (5 models)"          />
        <InfoRow label="Storage"           value="SQLite (leads.db)"              />
        <InfoRow label="Notifications"     value="Telegram Bot"                   />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-indigo-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">How to use this system</p>
            <p className="text-gray-400 text-sm">Run the pipeline manually or wait for the automatic schedule. Check the Leads page for new leads. Click the message icon on any lead to generate personalized outreach. Review, edit, copy, send manually, then click Mark as Sent.</p>
          </div>
        </div>
      </div>
    </div>
  )
}