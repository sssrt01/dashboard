import React, { useContext } from "react";
import ShiftContext from "../../../services/ShiftContext.jsx";
import formatTime from "../../../FormatTime.jsx";
import Clock from "../../Clock.jsx";

const TaskDashboard = () => {
  const { shift, activeTask, reload } = useContext(ShiftContext);

  if (!shift || !activeTask) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <div style={styles.clockContainer}>
          <Clock />
        </div>
        <div style={styles.shiftInfo}>
          <p style={styles.shiftName}>{shift.name}</p>
          <h1 style={styles.product}>{activeTask.product}</h1>
          <h2 style={styles.packing}>{activeTask.packing} л</h2>
        </div>
      </div>

      <div style={styles.middleRow}>
        <h1 style={styles.timer}>{formatTime(activeTask.time_spent)}</h1>
      </div>

      {/* Нижний ряд */}
      <div style={styles.bottomRow}>
        <div style={styles.bottomItem}>
          <p style={styles.label}>Виконано</p>
          <p style={styles.value}>{activeTask.ready_value}</p>
        </div>
        <div style={styles.bottomItem}>
          <p style={styles.label}>Ціль</p>
          <p style={styles.value}>{activeTask.target}</p>
        </div>
        <div style={styles.bottomItem}>
          <p style={styles.label}>Різниця</p>
          <p style={styles.value}>
            {activeTask.ready_value - activeTask.target}
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#fff",
    color: "#333",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    position: "relative", // Делаем родительский контейнер относительным
    padding: "5px",
    backgroundColor: "#f8f9fa",
    borderBottom: "2px solid #dee2e6",
  },
  clockContainer: {
    padding: "10px",
    textAlign: "center",
    minWidth: "120px",
    flexShrink: 0, // Запрещаем сжиматься
  },
  shiftInfo: {
    position: "absolute", // Центрируем по экрану
    left: "50%",
    transform: "translateX(-50%)", // Сдвигаем влево на половину ширины
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  shiftName: {
    margin: "0",
    fontSize: "1rem",
    color: "#777",
  },
  product: {
    margin: "0",
    fontSize: "2rem",
    fontWeight: "bold",
  },
  packing: {
    margin: "5px 0",
    fontSize: "2rem",
    color: "#555",
  },
  middleRow: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  timer: {
    fontSize: "5rem",
    fontWeight: "bold",
  },
  bottomRow: {
    display: "flex",
    justifyContent: "space-around",
    padding: "50px",
    backgroundColor: "#f0f0f0",
    borderTop: "2px solid #dee2e6",
  },
  bottomItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  label: {
    margin: "0",
    fontSize: "2.5rem",
    color: "#666",
  },
  value: {
    margin: "0",
    fontSize: "4rem",
    fontWeight: "bold",
  },
};

export default TaskDashboard;
