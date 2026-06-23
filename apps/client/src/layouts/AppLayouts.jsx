import Sidebar from "../components/layouts/SideBar";
import Topbar from "../components/layouts/Topbar";
import MobileNav from "../components/layouts/MobileNav";


function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen overflow-x-hidden bg-base-300 text-base-content">
      <aside className="hidden w-60 shrink-0 border-r border-[#242323] bg-base-200 md:flex">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-[4.75rem] items-center border-b border-[#242323]">
          <Topbar />
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-28 pt-8 sm:px-6 sm:pt-10 md:px-7 md:pb-8 lg:px-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

export default AppLayout;
