import agentWorkData from "../../constants/agentWorkData";
import GetStarted from "../getStarted/GetStarted";
import WorkComponent from "../workComponent/WorkComponent";
function LandingPageAgentWork() {
  return (
    <div className="flex flex-col items-center justify-center" >
            <div className="mt-12" >
                 <h2 className="text-center text-3xl font-bold">How It Works</h2>
              <p className="text-center text-lg mt-4 text-[#d6cdcd]">
                   Get started in three simple steps</p>
            </div>
            <div className="mx-auto mb-12 mt-10 grid w-full max-w-3xl grid-cols-1 gap-5 px-4">
{agentWorkData.map((item, index) => (
             <WorkComponent key={index} id={item.id} title={item.name} description={item.description} />
            ))}
            </div>
            <div className="w-full -mb-12 ">
            <div className="mx-auto w-full max-w-3xl px-4 py-12">
              <GetStarted/>
            </div>
            
            </div>
    </div>
  )
}

export default LandingPageAgentWork
