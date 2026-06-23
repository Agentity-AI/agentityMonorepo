import { useState } from "react";
import AuthDialog from "../auth/AuthDialog";

function SignUp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost h-10 min-h-0 rounded-lg border-none bg-[#14f195] px-4 text-[#05110c] hover:bg-[#35f7a6] sm:px-6"
      >
        <span className="text-sm font-semibold sm:text-base">Sign up</span>
      </button>
      {open && <AuthDialog mode="register" onClose={() => setOpen(false)} />}
    </>
  );
}

export default SignUp;
