import { useState } from "react";

export default function CalendarPanel() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarTitleId = "mini-calendar-title";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    // Empty cells for days before the month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} aria-hidden="true" style={styles.emptyDay}></div>);
    }

    // Days of the month
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const isToday =
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

      days.push(
        <div
          key={day}
          role="gridcell"
          aria-label={`${monthNames[currentDate.getMonth()]} ${day}, ${currentDate.getFullYear()}${isToday ? ", today" : ""}`}
          aria-current={isToday ? "date" : undefined}
          style={{
            ...styles.day,
            ...(isToday ? styles.todayDay : {}),
          }}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <section style={styles.container} aria-labelledby={calendarTitleId}>
      <div style={styles.header}>
        <button type="button" style={styles.navButton} onClick={prevMonth} aria-label="Show previous month">
          ←
        </button>
        <h3 id={calendarTitleId} style={styles.title} aria-live="polite">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button type="button" style={styles.navButton} onClick={nextMonth} aria-label="Show next month">
          →
        </button>
      </div>

      <div style={styles.weekDays} role="row">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`weekday-${index}`} role="columnheader" aria-label={weekdayNames[index]} style={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>

      <div style={styles.calendarGrid} role="grid" aria-labelledby={calendarTitleId}>{renderCalendarDays()}</div>
    </section>
  );
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  title: {
    fontSize: "0.85rem",
    fontWeight: "bold",
    color: "var(--text-color, white)",
    margin: 0,
  },
  navButton: {
    background: "none",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.9))",
    padding: "2px 6px",
    transition: "color 0.2s",
  },
  weekDays: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px",
    marginBottom: "2px",
  },
  weekDay: {
    textAlign: "center",
    fontSize: "0.65rem",
    fontWeight: "bold",
    color: "var(--text-color, rgba(255,255,255,0.86))",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px",
  },
  day: {
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    color: "var(--text-color, rgba(255,255,255,0.88))",
    borderRadius: "3px",
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "default",
    transition: "all 0.2s",
  },
  todayDay: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "var(--text-color, white)",
    fontWeight: "bold",
  },
  emptyDay: {
    aspectRatio: "1",
  },
};
