import { authentication } from "../../store/zustant/useZustandHook";

function SimulationTable({ items = [] }) {
  const {executeTask,payTask}= authentication();

  if (!items.length) {
    return (
      <div className="mt-4 rounded border border-gray-700 p-4 text-sm text-gray-400">
        No simulations found.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded border border-gray-700">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-900/60">
            <th className="border border-gray-700 px-3 py-2 text-left">
              Agent Name
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Task Type
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Status
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Payment Amount
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Payment Status
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Settlement Reference
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Created At
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Pay
            </th>
            <th className="border border-gray-700 px-3 py-2 text-left">
              Execute
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const payment = item.payment ?? {};

            return (
              <tr key={item.id} className="odd:bg-gray-900/40">
                <td className="border border-gray-700 px-3 py-2">
                  {item.agentName ?? "—"}
                </td>
                <td className="border border-gray-700 px-3 py-2">
                  {item.taskType ?? "—"}
                </td>
                <td className="border border-gray-700 px-3 py-2 capitalize">
                  {item.status ?? "—"}
                </td>
                <td className="border border-gray-700 px-3 py-2">
                  {payment.amount ?? "—"}
                </td>
                <td className="border border-gray-700 px-3 py-2 capitalize">
                  {payment.status ?? "—"}
                </td>
                <td className="border border-gray-700 px-3 py-2">
                  {payment.hederaTransactionId ? "Recorded" : "—"}
                </td>
               <td className="border border-gray-700 px-3 py-2">
                  <button onClick={() => executeTask(item.id)}>execute</button>
               </td>
               <td className="border border-gray-700 px-3 py-2">
                  <button onClick={() => payTask(item.id)}>pay</button>
               </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SimulationTable;
