import { NavLink } from "react-router-dom";
import { BookOpen, FolderKanban, BarChart3, Search, HardDrive, FolderOpen, PanelLeftClose, PanelLeft, Download, Upload, FolderSync, Calendar, Users } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/search", icon: Search, label: "Search" },
  { to: "/meeting", icon: Calendar, label: "Schedule" },
  { to: "/people", icon: Users, label: "Connection" },
  { to: "/", icon: BookOpen, label: "Journal" },
  { to: "/projects", icon: FolderKanban, label: "Studio" },
  { to: "/history", icon: BarChart3, label: "History" },
];

export function Sidebar() {
  const { vaultPath, openVault, changeVault, exportBackup, importBackup } = useData();
  const { collapsed, setCollapsed } = useSidebar();

  // Get short vault name for display
  const vaultName = vaultPath ? vaultPath.split(/[/\\]/).pop() || "Vault" : "Local";

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-full border-r border-zinc-800/60 bg-black/60 backdrop-blur-xl z-50 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "w-[60px]" : "w-[220px]"
        }`}
      >
        <div className="p-5 pb-6 flex items-center justify-between">
          {collapsed ? (
            <div className="w-full flex justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Expand sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between w-full">
                <h1 className="text-base font-bold text-zinc-100 tracking-tight truncate">Local Workspace</h1>
                <button
                  onClick={() => setCollapsed(true)}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 ml-1"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} end={item.to === "/"}>
              <item.icon className="w-[18px] h-[18px]" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800/60 space-y-3">
          {!collapsed && (
            <>
              <div className="rounded-lg bg-zinc-950/50 backdrop-blur-sm border border-zinc-800/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-zinc-300 font-medium">Vault</span>
                </div>
                <p className="text-[10px] text-zinc-500 truncate mb-2" title={vaultPath}>
                  {vaultName}
                </p>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openVault}
                    className="flex-1 h-7 text-[10px] gap-1 border-zinc-700 text-zinc-400 hover:text-white"
                    title="Open vault folder in file manager"
                  >
                    <FolderOpen className="w-3 h-3" />
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={changeVault}
                    className="flex-1 h-7 text-[10px] gap-1 border-zinc-700 text-zinc-400 hover:text-white"
                    title="Switch to a different vault directory"
                  >
                    <FolderSync className="w-3 h-3" />
                    Switch
                  </Button>
                </div>
              </div>

              {/* Backup actions */}
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportBackup}
                  className="flex-1 h-6 text-[9px] gap-1 text-zinc-500 hover:text-zinc-300"
                  title="Export vault backup as JSON"
                >
                  <Download className="w-2.5 h-2.5" />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={importBackup}
                  className="flex-1 h-6 text-[9px] gap-1 text-zinc-500 hover:text-zinc-300"
                  title="Import vault from JSON backup"
                >
                  <Upload className="w-2.5 h-2.5" />
                  Import
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-zinc-500">All data stored locally as .md files</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
