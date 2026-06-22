import { Banknote, Bot, Lock, MonitorCheck, Shield, TestTube } from "lucide-react";

function ReturnIcon({id}){
    switch(id){
        case 1:
            return <Bot className="w-6 h-6 text-[#0d59a5]"/>;
        case 2:
            return <TestTube className="w-6 h-6 text-[#0d59a5]"/>;
        case 3:
            return <Shield className="w-6 h-6 text-[#0d59a5]"/>;
        case 4:
            return <Banknote className="w-6 h-6 text-[#0d59a5]"/>;
        case 5:
            return <MonitorCheck className="w-6 h-6 text-[#0d59a5]"/>;
        case 6:
            return <Lock className="w-6 h-6 text-[#0d59a5]"/>;
        default:
            return "";
    }
}

function LandingPageAgentCard({id, title, description}) {


  return (
    <div className="w-full rounded-lg bg-[#0a0a0a] px-5 py-4 shadow-lg">
       <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#232f3b] mb-4">
        <ReturnIcon id={id}/>
      </div>
      <h2 className="mx-auto text-xl font-bold text-white">{title}</h2>
      <p className="mx-auto text-gray-300 mt-2">{description}</p>
    </div>
  )
}

export default LandingPageAgentCard
