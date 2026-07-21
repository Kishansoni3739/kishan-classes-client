import { LogOut, Menu, X, User } from "lucide-react";
import { useState, useMemo } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navItems } from "../data/navigation.js";
import { useAuth } from "../context/AuthContext.jsx";

export const AppShell = () => {
  const { user, profile, switchableProfiles, switchProfile, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const ProfileSwitcher = () => {
    const [isOpen, setIsOpen] = useState(false);

    if (user?.role !== "student" || !switchableProfiles || switchableProfiles.length === 0) {
      return null;
    }

    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
        >
          <span>Switch Student ({switchableProfiles.length})</span>
          <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Guardian Accounts
              </div>
              <div className="max-h-48 overflow-y-auto">
                {switchableProfiles.map((sibling) => (
                  <button
                    key={sibling.userId}
                    onClick={() => {
                      setIsOpen(false);
                      switchProfile(sibling.userId);
                    }}
                    className="w-full text-left block px-3 py-2 text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800">{sibling.name}</div>
                    <div className="text-[10px] text-slate-400">ID: {sibling.studentId}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const items = useMemo(() => {
    const list = navItems.filter((item) => item.roles.includes(user.role));
    if (profile?._id && user.role === "teacher") {
      list.push({
        label: "My Profile",
        path: `/teachers/${profile._id}`,
        icon: User,
        roles: [user.role]
      });
    }
    return list;
  }, [user, profile]);

  const Nav = () => (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                isActive ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
              }`
            }
          >
            <Icon size={18} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block print:hidden">
        <div className="mb-8">
          <div className="text-xl font-bold text-ink">Kishan Classes</div>
          <div className="text-xs uppercase tracking-wide text-brand">Management System</div>
        </div>
        <Nav />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity duration-300 lg:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} 
        onClick={() => setOpen(false)} 
      />

      {/* Mobile Sidebar Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 h-full w-[80%] max-w-[280px] bg-white p-4 shadow-soft transition-transform duration-300 ease-in-out lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`} 
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="font-bold text-ink">Kishan Classes</div>
            <div className="text-[10px] uppercase tracking-wide text-brand">Menu</div>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-md border border-slate-200" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <Nav />
      </aside>

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
          <div className="flex h-14 lg:h-16 items-center justify-between px-3 sm:px-6 lg:px-8">
            <button className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="hidden lg:block">
              <div className="text-sm text-slate-500">Welcome back</div>
              {profile?._id && user.role === "teacher" ? (
                <NavLink 
                  to={`/teachers/${profile._id}`} 
                  className="font-semibold text-ink hover:text-brand hover:underline transition-colors"
                >
                  {user.name}
                </NavLink>
              ) : (
                <div className="font-semibold text-ink">{user.name}</div>
              )}
            </div>
            
            <div className="ml-auto flex items-center gap-3">
              <ProfileSwitcher />
              <span className="rounded-full bg-saffron/15 px-3 py-1 text-xs font-semibold capitalize text-amber-700">{user.role}</span>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={logout}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>
        <main className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
