import { useState } from "react";

export default function CalendarPanel() {
  const [currentDate, setCurrentDate] = useState(new Date());

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
      days.push(<div key={`empty-${i}`} style={styles.emptyDay}></div>);
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
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.navButton} onClick={prevMonth}>
          ←
        </button>
        <h3 style={styles.title}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button style={styles.navButton} onClick={nextMonth}>
          →
        </button>
      </div>

      <div style={styles.weekDays}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
          <div key={day} style={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>

      <div style={styles.calendarGrid}>{renderCalendarDays()}</div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: "bold",
    color: "var(--text-color, white)",
    margin: 0,
  },
  navButton: {
    background: "none",
    border: "none",
    fontSize: "1.2rem",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.7))",
    padding: "4px 8px",
    transition: "color 0.2s",
  },
  weekDays: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    marginBottom: "4px",
  },
  weekDay: {
    textAlign: "center",
    fontSize: "0.75rem",
    fontWeight: "bold",
    color: "var(--text-color, rgba(255,255,255,0.6))",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
  },
  day: {
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    color: "var(--text-color, rgba(255,255,255,0.7))",
    borderRadius: "4px",
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer",
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
