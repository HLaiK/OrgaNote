import React from "react";
import CalendarPanel from "./CalendarPanel";
import ProgressPanel from "./ProgressPanel";
import TasksPanel from "./TasksPanel";
import UnstructuredInput from "./UnstructuredInputPanel";
import { theme } from "../theme";

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridTemplateRows: "1fr auto",
    gap: "20px",
    padding: "20px",
    height: "100vh",
    background: theme.colors.background,
  },

  panel: {
    background: theme.colors.panel,
    borderRadius: theme.radius,
    padding: "20px",
    boxShadow: theme.shadow,
    border: `${theme.outlineWidth} solid ${theme.colors.outline}`,
    overflow: "hidden"
  },

  bottomInput: {
    gridColumn: "1 / span 3",
    background: theme.colors.panel,
    borderRadius: theme.radius,
    padding: "20px",
    boxShadow: theme.shadow,
    border: `${theme.outlineWidth} solid ${theme.colors.outline}`,
  }
};

export default function Dashboard() {
  return (
    <div style={styles.container}>

      {/* LEFT: Calendar */}
      <div style={styles.panel}>
        <CalendarPanel />
      </div>

      {/* MIDDLE: Progress */}
      <div style={styles.panel}>
        <ProgressPanel />
      </div>

      {/* RIGHT: Tasks */}
      <div style={styles.panel}>
        <TasksPanel />
      </div>

      {/* BOTTOM: NLP Input */}
      <div style={styles.bottomInput}>
        <UnstructuredInput />
      </div>

    </div>
  );
}
