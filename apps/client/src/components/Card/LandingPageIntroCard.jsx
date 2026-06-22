function LandingPageIntroCard({ title, description }) {
  return (
    <div className="w-full rounded-lg bg-[#0f0f0f] p-6 shadow-lg">
      <h2 className="mx-auto text-xl font-bold text-white">{title}</h2>
      <p className="mx-auto text-gray-300 mt-2">{description}</p>
    </div>
  )
}

export default LandingPageIntroCard
