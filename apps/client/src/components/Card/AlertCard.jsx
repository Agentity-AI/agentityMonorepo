function AlertCard({ title, description, dataTime, severity, status, type }) {
  const severityLabel = severity || "low";

  return (
    <div
      className={`card rounded-lg border p-4 ${
        severityLabel === "critical" || severityLabel === "high"
          ? "border-red-500 bg-[#41060e]"
          : severityLabel === "medium"
            ? "border-yellow-500 bg-[#3b3f0633]"
            : "border-green-500 bg-[#085f3333]"
      }`}
    >
      <div className="card-body gap-2 p-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="card-title text-base">{title}</h2>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase text-gray-300">
            {severityLabel}
          </span>
          {status && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-gray-400">
              {status}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-200">{description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {type && <span>{type.replaceAll("_", " ")}</span>}
          <span>{dataTime}</span>
        </div>
      </div>
    </div>
  );
}

export default AlertCard;
