import SignUp from "../signUp/SignUp"

function GetStarted() {
  return (
   <div className="flex flex-col items-center justify-center h-70 border-2 border-[#30035a]
    bg-[#1a1024] text-white rounded-2xl p-10">
    <h1 className="text-4xl font-bold mb-4">Ready To Get Started?</h1>
    <p className="text-lg mb-8 text-center max-w-xl">
      Your all-in-one solution for Hedera agent verification, simulation,
       payment, execution, and auditing. Get started.</p>
      <SignUp/>
  </div>
  )
}

export default GetStarted
