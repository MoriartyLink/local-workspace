import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Minus, Square, X } from "lucide-react";
import { DataProvider } from "@/contexts/DataContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { Sidebar } from "@/components/Sidebar";
import { JournalPage } from "@/pages/JournalPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { ProjectPage } from "@/pages/ProjectPage";
import { SearchPage } from "@/pages/SearchPage";
import { MeetingPage } from "@/pages/MeetingPage";
import { PeoplePage } from "@/pages/PeoplePage";
import "@/types/electron";

function MenuListener() {
  const navigate = useNavigate();
  const { setCollapsed, collapsed } = useSidebar();

  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanups = [
      window.electronAPI.onMenuNavigate((path: string) => navigate(path)),
      window.electronAPI.onMenuToggleSidebar(() => setCollapsed(!collapsed)),
    ];
    return () => cleanups.forEach(fn => fn());
  }, [navigate, setCollapsed, collapsed]);

  return null;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const isDesktop = Boolean(window.electronAPI);
  return (
    <>
      <Sidebar />
      {isDesktop && (
        <>
          <div
            className="window-drag-region fixed top-0 z-[60] h-9"
            style={{ left: collapsed ? 72 : 248, right: 108 }}
            aria-hidden="true"
          />
          <div className="window-controls fixed right-0 top-0 z-[70] flex h-9">
            <button
              type="button"
              onClick={() => window.electronAPI?.minimize()}
              aria-label="Minimize window"
              className="flex w-9 items-center justify-center text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.electronAPI?.maximize()}
              aria-label="Maximize or restore window"
              className="flex w-9 items-center justify-center text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => window.electronAPI?.close()}
              aria-label="Close window"
              className="flex w-9 items-center justify-center text-zinc-500 transition-colors hover:bg-red-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
      <main
        className={`app-main px-5 pb-14 sm:px-7 lg:px-10 ${isDesktop ? "pt-12" : "pt-6"}`}
        style={{ marginLeft: collapsed ? 72 : 248 }}
      >
        <div className="app-content">{children}</div>
      </main>
    </>
  );
}

function App() {
  return (
    <HashRouter>
      <DataProvider>
        <SidebarProvider>
          <MenuListener />
          <Routes>
            <Route path="/" element={<AppLayout><JournalPage /></AppLayout>} />
            <Route path="/projects" element={<AppLayout><ProjectPage /></AppLayout>} />
            <Route path="/history" element={<AppLayout><HistoryPage /></AppLayout>} />
            <Route path="/search" element={<AppLayout><SearchPage /></AppLayout>} />
            <Route path="/meeting" element={<AppLayout><MeetingPage /></AppLayout>} />
            <Route path="/people" element={<AppLayout><PeoplePage /></AppLayout>} />
          </Routes>
        </SidebarProvider>
      </DataProvider>
    </HashRouter>
  );
}

export default App;
