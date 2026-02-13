import useUser from "./hooks/useUser";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";

function App() {
  const userId = useUser();

  if (!userId) return null;

  const hasVisitedBefore = localStorage.getItem("organote_has_visited");

  if (!hasVisitedBefore) {
    return <HomePage onFinish={() => localStorage.setItem("organote_has_visited", "true")} />;
  }

  return <Dashboard />;
}

export default App;
