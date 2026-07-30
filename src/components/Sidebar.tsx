import { NavLink } from "react-router-dom";
import { BookOpen, FolderKanban, BarChart3, Search, HardDrive, FolderOpen, PanelLeftClose, PanelLeft, FolderSync, Calendar, Users } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/logo.png";

const navItems = [
  { to: "/search", icon: Search, label: "Search" },
  { to: "/meeting", icon: Calendar, label: "Schedule" },
  { to: "/people", icon: Users, label: "Connection" },
  { to: "/", icon: BookOpen, label: "Journal" },
  { to: "/projects", icon: FolderKanban, label: "Studio" },
  { to: "/history", icon: BarChart3, label: "History" },
];

export function Sidebar() {
  const { vaultPath, openVault, changeVault } = useData();
  const { collapsed, setCollapsed } = useSidebar();

  // Get short vault name for display
  const vaultName = vaultPath ? vaultPath.split(/[/\\]/).pop() || "Vault" : "Local";

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[#B8CEE2]/10 bg-[linear-gradient(160deg,rgba(184,206,226,0.075),rgba(22,24,35,0.7)_24%,rgba(9,9,16,0.72))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.025),14px_0_48px_rgba(2,2,8,0.24)] backdrop-blur-3xl transition-all duration-300 ease-out ${
          collapsed ? "w-[72px]" : "w-[248px]"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between px-4">
          {collapsed ? (
            <div className="flex w-full justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#B8CEE2]/10 bg-[#B8CEE2]/[0.055] text-[#98A8BC] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:bg-[#B8CEE2]/10 hover:text-white"
                title="Expand sidebar"
              >
                <PanelLeft className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : (
              <div className="flex w-full items-center justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-[9px] object-cover" />
                  <h1 className="truncate text-[15px] font-semibold tracking-[-0.025em] text-[#EAF2FA]">Local Workspace</h1>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="ml-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#758399] transition-colors hover:bg-[#B8CEE2]/[0.07] hover:text-[#EAF2FA]"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
          )}
        </div>

        {!collapsed && <p className="px-5 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#66758B]">Workspace</p>}
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} end={item.to === "/"}>
              <item.icon className="h-[17px] w-[17px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/[0.065] p-3.5">
          {!collapsed && (
            <>
              <div className="rounded-[14px] border border-white/[0.075] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
                <div className="mb-2 flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-[#B8CEE2]" />
                  <span className="text-[11px] font-medium text-[#DCE7F1]">Vault</span>
                </div>
                <p className="mb-2.5 truncate text-[10px] text-[#758399]" title={vaultPath}>
                  {vaultName}
                </p>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openVault}
                    className="h-7 flex-1 gap-1 text-[10px]"
                    title="Open vault folder in file manager"
                  >
                    <FolderOpen className="w-3 h-3" />
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={changeVault}
                    className="h-7 flex-1 gap-1 text-[10px]"
                    title="Switch to a different vault directory"
                  >
                    <FolderSync className="w-3 h-3" />
                    Switch
                  </Button>
                </div>
              </div>

            </>
          )}
        </div>
      </aside>
    </>
  );
}
