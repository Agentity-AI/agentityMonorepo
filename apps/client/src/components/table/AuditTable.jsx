function AuditTable({ contractname, risklevel, consensusScore, status, onView }) {
  const statusColor =
    status === "completed"
      ? "text-green-500"
      : status === "failed"
        ? "text-red-500"
        : "text-yellow-500";

  return (
     <tr className="py-2 h-10 w-full border-b grid grid-cols-5 border-[#514c4c] px-4 hover:bg-[#2f2f2f]">
      <td className="text-left  text-sm text-base-content/60">
        {contractname}
      </td>

      <td className="text-left mx-2 text-sm text-base-content/60">
        {risklevel}
      </td>

      <td className="text-left mx-4 text-sm text-base-content/60">
        {consensusScore}
      </td>

      <td
        className={`text-left mx-5 text-sm flex items-center gap-1 ${statusColor}`}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        <span>{status}</span>
      </td>


      <td className="text-left mx-7 text-sm text-base-content/60 flex items-center">
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={onView}
        >
         view
        </button>
      </td>
    </tr>
  )
}

export default AuditTable;
