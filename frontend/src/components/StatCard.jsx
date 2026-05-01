export default function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{label}</span>
        <Icon size={18} className={color} />
      </div>
      <p className="text-3xl font-bold text-white">{value ?? 0}</p>
    </div>
  )
}