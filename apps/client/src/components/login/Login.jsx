import { useState } from "react";
import AuthDialog from "../auth/AuthDialog";

function Login() {
  const [open, setOpen] = useState(false);
   
  return (
    <>
      <button
        className="btn btn-ghost h-10 min-h-0 rounded-lg border-none bg-white px-4 text-[#24115d] hover:bg-[#f0eff4] sm:px-6"
        onClick={() => setOpen(true)}
      >
        <span className="text-sm font-semibold sm:text-base">Login</span>
      </button>
      {open && <AuthDialog mode="login" onClose={() => setOpen(false)} />}
    </>
  );
}
export default Login
