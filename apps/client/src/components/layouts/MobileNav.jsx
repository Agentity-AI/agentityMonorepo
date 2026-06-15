import { NavLink } from "react-router-dom";
import navItems from "../../constants/navItem";
import SideIcon from "./SideIcon";

function shortLabel(label) {
  if (label === "Smart Contracts Audits") return "Audits";
  if (label === "SDK & Documentation") return "Docs";
  if (label === "Transactions") return "Txns";
  if (label === "Simulations") return "Sim";
  return label;
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#242323] bg-[#0f0f0f] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl md:hidden">
      <div className="grid grid-cols-7 gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            aria-label={item.label}
            className={({ isActive }) =>
              [
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] leading-none transition-colors",
                isActive
                  ? "bg-base-300 text-[#14f195]"
                  : "text-base-content/60 hover:bg-base-300/70 hover:text-base-content",
              ].join(" ")
            }
          >
            <SideIcon name={item.label} />
            <span className="max-w-full truncate">{shortLabel(item.label)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default MobileNav;
