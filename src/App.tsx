import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
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
  return (
    <>
      <Sidebar />
      <main
        className="app-main px-5 pb-14 pt-6 sm:px-7 lg:px-10"
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
