import LandingPageIntroCard from "../Card/LandingPageIntroCard"
import LandingPageIntroData from '../../constants/LandingPageIntroData'
import SignUp from "../signUp/SignUp"
import Login from "../login/Login"
function LandingPageIntro() {
  return (
    <div className='mt-24 px-4 text-white'>
        <div className='mx-auto mt-5 flex w-fit max-w-full items-center justify-center gap-2 rounded-full border border-[#14f195]/30 bg-[#06140f] px-4 py-2 text-center text-sm text-[#14f195] shadow-lg sm:text-base'>
          <span className='h-2.5 w-2.5 rounded-full bg-[#14f195]' />
          <p>Live trust proofs for autonomous AI agents</p>
        </div>
    <div className='mt-10 px-4'>
    <h1 className='mt-9 text-center text-3xl font-bold sm:text-4xl'>Secure AI Agent Infrastructure</h1>
    <p className='mx-auto mt-4 max-w-4xl text-center text-base text-[#c1c1c1] sm:text-lg'>Verify, simulate, pay, execute, and audit AI agents with tamper-evident proof trails before they touch production workflows.</p>
</div>
<div className='mt-10 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center'>
    <SignUp/>
    <Login/>
</div>
<div className='mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>

{LandingPageIntroData.map((item, index) => (
    <LandingPageIntroCard key={index} title={item.number} description={item.text}/>
))}
    </div>

        </div>
  )
}

export default LandingPageIntro
