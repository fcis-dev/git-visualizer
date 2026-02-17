import { ThemeProvider } from "./presentation/context/ThemeContext";
import { DialogProvider } from "./presentation/context/DialogContext";
import { Dashboard } from "./presentation/pages/Dashboard";

function App() {
  return (
    <ThemeProvider>
      <DialogProvider>
        <Dashboard />
      </DialogProvider>
    </ThemeProvider>
  );
}

export default App;
