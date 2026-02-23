import useUser from "./hooks/useUser";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import { useState } from "react";

function App() {
  const userId = useUser();
  const [hasVisited, setHasVisited] = useState(() => localStorage.getItem("organote_has_visited"));

  if (!userId) return null;

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

  if (!hasVisited) {
    return <HomePage 
    themeColor={themeSettings.bgColor}
    onFinish={() => {
      localStorage.setItem("organote_has_visited", "true");
      setHasVisited("true");
    }} />;
  }

  return <Dashboard themeColor={themeSettings.bgColor}/>;
}

export default App;
