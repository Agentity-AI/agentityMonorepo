import { Link, NavLink } from "react-router-dom";
import navItems from "../../constants/navItem";
import logo from "../../assets/Agentity-logo.png"
import SideIcon from "./SideIcon";
function Sidebar() {
  return (
    <div className="sticky top-0 flex h-screen w-60 flex-col bg-[#0f0f0f]">
      <Link to={"/"} >
      <div className="h-16 flex items-center px-4 gap-2 border-b border-[#242323]">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-xl text-primary-content">
            <img src={logo} alt="ahentity logo"/>
          </span>
        </div>
        <span className="font-semibold text-lg">Agentity</span>
      </div>
</Link>
      <nav className="flex-1 space-y-1 overflow-y-auto py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-4 py-2 text-sm cursor-pointer rounded-lg transition-colors",
                "hover:bg-[#4d4dc4] hover:text-primary",
                isActive ? "bg-base-300 text-primary font-medium" : "text-base-content/80",
              ].join(" ")
            }>
           <SideIcon name={item.label}/>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
