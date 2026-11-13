import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MOBILE_BOTTOM_NAV_ITEMS } from "./navConfig";

interface MobileBottomNavProps {
  isItemActive: (id: string) => boolean;
}

export function MobileBottomNav({ isItemActive }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#121212]/95 backdrop-blur-lg pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] lg:hidden shadow-2xl mobile-bottom-nav"
      aria-label="Điều hướng di động"
    >
      {MOBILE_BOTTOM_NAV_ITEMS.map(({ id, label, to, icon: Icon }) => {
        const active = isItemActive(id);
        return (
          <Link
            key={id}
            to={to}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1 min-h-[44px] text-[10px] font-medium transition-all active:scale-95 select-none",
              active ? "text-[#ff5964] font-bold" : "text-white/70 hover:text-white",
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            <span className="truncate max-w-[62px] text-center leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
