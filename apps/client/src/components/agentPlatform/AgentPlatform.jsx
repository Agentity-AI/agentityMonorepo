import landingPageAgentData from "../../constants/landingPageAgentData"
import LandingPageAgentCard from "../Card/LandingPageAgentCard"
function AgentPlatform() {
  return (
    <div className="text-amber-50 py-12 bg-[#0f0f0f] mt-18">
      <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">
        Complete AI Agent Platform</h2>
      <p className="text-center text-lg mt-4 text-[#f3eded]">
       Everything you need to build, test, and deploy secure AI agents</p>
        </div>
      <div className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
{landingPageAgentData.map((item, index) => (
    <LandingPageAgentCard key={index} id={item.id} title={item.name} description={item.description}/>
))}

        </div>
        
      
      
      </div>
  )
}

export default AgentPlatform
