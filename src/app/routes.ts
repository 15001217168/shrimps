import { createBrowserRouter } from "react-router";
import { DesktopLayout } from "./layout";
import { ChatPage } from "./pages/ChatPage";
import { SkillsPage } from "./pages/SkillsPage";
import { AgentsPage } from "./pages/AgentsPage";
import { TasksPage } from "./pages/TasksPage";
import { WorkflowsPage } from "./pages/WorkflowsPage";
import { ExplorePage } from "./pages/ExplorePage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DesktopLayout,
    children: [
      { index: true, Component: ChatPage },
      { path: "explore", Component: ExplorePage },
      { path: "skills", Component: SkillsPage },
      { path: "agents", Component: AgentsPage },
      { path: "workflows", Component: WorkflowsPage },
      { path: "tasks", Component: TasksPage },
      { path: "settings", Component: SettingsPage }
    ],
  },
]);
