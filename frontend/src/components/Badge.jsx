export default function Badge({ label }) {
  const styles = {
    hiring:     "bg-green-900 text-green-300",
    not_hiring: "bg-red-900 text-red-300",
    maybe:      "bg-yellow-900 text-yellow-300",
    new:        "bg-blue-900 text-blue-300",
    reviewed:   "bg-gray-700 text-gray-300",
    contacted:  "bg-indigo-900 text-indigo-300",
    closed:     "bg-gray-800 text-gray-500",
    unscored:   "bg-gray-800 text-gray-500",
  }

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${styles[label] || "bg-gray-700 text-gray-400"}`}>
      {label?.replace("_", " ") || "unknown"}
    </span>
  )
}