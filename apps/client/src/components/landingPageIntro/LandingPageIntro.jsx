import LandingPageIntroCard from "../Card/LandingPageIntroCard"
import LandingPageIntroData from '../../constants/LandingPageIntroData'
import SignUp from "../signUp/SignUp"
import Login from "../login/Login"
function LandingPageIntro() {
  return (
    <div className='text-white mt-25 px-4'>
        <div className='mx-auto mt-5 flex w-fit items-center justify-center gap-2 rounded-full border border-[#14f195]/30 bg-[#06140f] px-4 py-2 text-[#14f195] shadow-lg'>
          <span className='h-2.5 w-2.5 rounded-full bg-[#14f195]' />
          <p>Live trust proofs for autonomous AI agents</p>
        </div>
    <div className='mt-10 px-4'>
    <h1 className='text-4xl font-bold text-center mt-9 '>Secure AI Agent Infrastructure</h1>
    <p className='text-center mt-4 text-lg max-w-4xl mx-auto  text-[#c1c1c1]'>Verify, simulate, pay, execute, and audit AI agents with tamper-evident proof trails before they touch production workflows.</p>
</div>
<div className='flex items-center justify-center mt-10 gap-2'>
    <SignUp/>
    <Login/>
</div>
<div className='grid grid-cols-1 md:grid-cols-3 mt-10 px-55 '>

{LandingPageIntroData.map((item, index) => (
    <LandingPageIntroCard key={index} title={item.number} description={item.text}/>
))}
    </div>

        </div>
  )
}

export default LandingPageIntro
