import React, {useContext} from "react";
import Clock from "../../Clock.jsx";
import formatTime from "../../../FormatTime.jsx";
import ShiftContext from "../../../services/ShiftContext.jsx";

const BreakTimer = () => {
    const {shift, activeTask, reload} = useContext(ShiftContext);


    return (
        <div style={styles.container}>
            <div style={styles.topRow}>
                <div style={styles.clockContainer}>
                    <Clock/>
                </div>
                <div style={styles.shiftInfo}>
                    <h1 style={styles.breakText}>Перерва</h1>
                </div>
            </div>

            <div style={styles.middleRow}>
                <h1 style={styles.timer}>{formatTime(activeTask.remaining_time)}</h1>
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
        justifyContent: "space-between",
        padding: "20px",
        backgroundColor: "#f8f9fa",
        borderBottom: "2px solid #dee2e6",
    },
    clockContainer: {
        padding: "10px",
        textAlign: "center",
        minWidth: "120px",
    },
    shiftInfo: {
        textAlign: "center",
        flex: 1,
    },
    breakText: {
        margin: "0",
        fontSize: "2rem",
        fontWeight: "bold",
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
};

export default BreakTimer;
