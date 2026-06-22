import { useState } from "react";
import { BanknoteIcon, Bot, LucideTestTube, MonitorCheck, Shield } from "lucide-react";
function Card({ label, value, deltaText }) {

const [shadowStyle, setShadowStyle] = useState("");

  function addTextShadow() {
   
    
    setShadowStyle(`border border-[#4d4dc4] border-2xl `);
  }
  function SetIcon(){
    if(label === "Total Agents"){
      return <Bot className="text-[#4d4dc4]" size={24} />
    }else if(label === "Verified Agents"){
      return <Shield className="text-[#4d4dc4]" size={24} />
    }else if(label === "Active Simulations"){
      return <LucideTestTube className="text-[#4d4dc4]" size={24} />
    }else if(label === "Vulnerabilities Detected"){
      return <MonitorCheck className="text-[#4d4dc4]" size={24} />
    }else if(label === "Transactions Executed"){
      return <BanknoteIcon className="text-[#4d4dc4]" size={24} />
    }
  }
  return (
   <div
            key={label}
            className={`card rounded-lg bg-[#0f0f0f] ${shadowStyle ? shadowStyle : ''}`}
         onMouseOver={addTextShadow}
          onMouseOut={() => setShadowStyle("")}
         >
            <div className="card-body py-4 px-4 ">
              <div className="flex justify-between items-center">
              <p className="text-[12px] uppercase tracking-wide text-base-content/60">
                {label}
              </p>
              <div className="w-10 h-10 border border-[#4d4dc4]  bg-[#4d4dc4]/30 p-2 rounded-full flex items-center justify-center">
              {SetIcon()}
              </div>
              </div>
              <p className="text-3xl font-semibold mt-2">{value}</p>
              {deltaText && (
                <p className={`text-xs mt-1 text-green-600`}>{deltaText}
                </p>
              )}
            </div>
          </div>
  )
}

export default Card
