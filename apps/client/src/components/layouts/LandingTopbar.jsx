import SignUp from '../signUp/SignUp';
import Login from '../login/Login';
import logo from "../../assets/Agentity-logo.png"
import { User } from 'lucide-react';
import { Loading } from '../loading/Loading';
import { authentication } from '../../store/zustant/useZustandHook';
import { useNavigate } from 'react-router-dom';

function LandingTopbar({dashboardData,loading}) {
const {dashBoard}=authentication();
  const navigate = useNavigate();
  function toDashboard(){
    if (dashBoard)   navigate("/dashboard")
  }
    return (
    <div className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-[#514c4c]
    bg-[#0f0f0f] 
     ">
        {/* Left side (optional breadcrumb / page title placeholder) */}
        <div className="h-16 bg-[#0f0f0f0] flex items-center px-4 gap-2 border-none ">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-xl text-primary-content">
             <img src={logo} alt="Agentity logo"/>
          </span>
        </div>
        <span className="font-semibold text-lg">Agentity</span>
      </div>
        {/* Right side controls */}
        {loading ? (
          <Loading />
        ) : dashboardData ? (
          <button className="mr-3 flex cursor-pointer items-center gap-4 sm:mr-6" onClick={toDashboard}>
            <User className="h-9 w-9 text-white sm:h-10 sm:w-10" />
          </button>
        ) : (
          <div className="mr-3 flex items-center gap-2 sm:mr-6 sm:gap-3">
            <Login />
            <SignUp />
          </div>
        )}
    </div>
  );
}

export default LandingTopbar
