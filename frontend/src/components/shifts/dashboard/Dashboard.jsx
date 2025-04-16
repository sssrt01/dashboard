import React, {useContext, useEffect} from "react";
import ShiftContext from "../../../services/ShiftContext.jsx";
import "../../../assets/style.css";
import BreakDashboard from "./BreakDashboard.jsx";
import TaskDashboard from "./TaskDashboard.jsx";

const Dashboard = () => {
    const {shift, activeTask, reload} = useContext(ShiftContext);

    useEffect(() => {
        if (!shift) {
            const intervalId = setInterval(() => {
                window.location.reload();
            }, 10000);
            return () => clearInterval(intervalId);
        }
    }, [shift]);


    if (!activeTask) {
        return <h1>Немає активної зміни.</h1>;
    }

    if (activeTask.type === "BREAK") {
        return <BreakDashboard/>
    }

    if (activeTask.type === "TASK") {
        return <TaskDashboard/>
    }
};

export default Dashboard;
