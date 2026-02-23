import useUser from "./hooks/useUser";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";

function App() {
  const userId = useUser();
  if (!userId) return null;

  const hasVisitedBefore = localStorage.getItem("organote_has_visited");

  const savedBg = localStorage.getItem("organote_bg_color"); 
  const savedGradient = localStorage.getItem("organote_use_gradient"); 
  const savedGradientColor = localStorage.getItem("organote_gradient_color"); 
  const savedFontColor = localStorage.getItem("organote_font_color");

  const themeSettings = {
    bgColor: savedBg, 
    useGradient: savedGradient === "true", 
    gradientColor: savedGradientColor, 
    fontColor: savedFontColor 
  };

  if (!hasVisitedBefore) {
    return <HomePage 
    themeColor={themeSettings.bgColor}
    onFinish={() => localStorage.setItem("organote_has_visited", "true")} />;
  }

  return <Dashboard themeColor={themeSettings.bgColor}/>;
}

export default App;
