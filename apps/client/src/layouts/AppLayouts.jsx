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
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#242323]">
          <Topbar />
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-24 sm:px-4 sm:py-5 md:p-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

export default AppLayout;
