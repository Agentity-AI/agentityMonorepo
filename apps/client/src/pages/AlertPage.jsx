import SideIcon from '../components/layouts/SideIcon';
import AppLayout from '../layouts/AppLayouts'
import { authentication } from '../store/zustant/useZustandHook';
import AlertCard from '../components/Card/AlertCard';
import formatDate from '../helper/formatDate';
import { useEffect } from 'react';


function AlertPage() {
    const {alerts,alertSummary,getAlert,getAlertSummary} = authentication();
   const {total,active,resolved,critical} = alertSummary||{
    total: 0,
    active: 0,
    resolved: 0,
    critical: 0 
   };
   useEffect(() => {
    getAlert();
    getAlertSummary();
   }, [getAlert,getAlertSummary]);
  return (
    <AppLayout>
       <div className="mb-6 flex flex-col rounded-lg p-3 sm:p-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">
            Alerts & Monitoring
          </h1>
          <p className="text-sm text-gray-400">
           Real-time security alerts and system notifications
          </p>
        </div>

        {/* Policies bar + cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    
          <div className="flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7862f8]/20 p-2">
             <SideIcon name={"TotalAlerts"} color="#7862f8"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Total Alert  </h2>
              <p className="text-2xl font-bold  text-[#7862f8]">{ total}</p>
            </div>
             
          </div>
          <div className="flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-200/50 p-2">
             <SideIcon name={"ActiveAlerts"} color="yellow"/>
            
            </div>
            <div>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Active </h2>
              <p className="text-2xl font-bold text-yellow-400">{ active}</p>
            </div>
             
          </div>
          <div className="flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00ff00]/20 p-2">
             <SideIcon name={"ResolvedAlerts"} color="#00ff00"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Resolved </h2>
              <p className="text-2xl font-bold text-[#00ff00]">{ resolved}</p>
            </div>
          </div>
          <div className="flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff0000]/20 p-2">
             <SideIcon name={"CriticalAlerts"} color="red"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Critical </h2>
              <p className="text-2xl font-bold text-red-500">{ critical}</p>
            </div>
             
          </div>
        </div>

        <div className="mt-6 min-h-64 w-full rounded-xl border-none bg-[#0f0f0f] pb-5">
            <h6 className="px-4 py-6 text-lg text-base-content/60 sm:px-5 sm:py-8 sm:text-xl">
           Alert Feed {alerts.length ? alerts.length : 0}
            </h6>
            <div className="grid grid-cols-1 gap-4 px-4 sm:px-5">
                {
                  alerts.map((alert)=>{
                      return <AlertCard key={alert.id} title={alert.title} description={alert.message}
                            dataTime={formatDate(alert.createdAt)} severity={alert.severity}
                            status={alert.status} type={alert.type} />
                    })
                }
                {!alerts.length && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-5 text-sm text-gray-400">
                    No alerts yet. Register an agent, run a simulation, create a policy, or submit a contract audit to populate monitoring events.
                  </div>
                )}
            </div>
        </div>


        </div>
    </AppLayout>
  )
}

export default AlertPage
