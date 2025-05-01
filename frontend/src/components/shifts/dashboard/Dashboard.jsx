import React, {useContext, useEffect} from "react";
import ShiftContext from "../../../services/ShiftContext.jsx";
import "../../../assets/style.css";
import BreakDashboard from "./BreakDashboard.jsx";
import TaskDashboard from "./TaskDashboard.jsx";

const REFRESH_INTERVAL_MS = 10000;

const Dashboard = () => {
    const {shift, activeTask} = useContext(ShiftContext);

    const useAutoRefresh = (isEnabled) => {
        useEffect(() => {
            if (!isEnabled) {
                const intervalId = setInterval(() => {
                    window.location.reload();
                }, REFRESH_INTERVAL_MS);
                return () => clearInterval(intervalId);
            }
        }, [isEnabled]);
    };

    useAutoRefresh(shift);

    if (!activeTask) {
        return <h1>Немає активної зміни.</h1>;
    }

    const dashboardComponents = {
        BREAK: BreakDashboard,
        TASK: TaskDashboard
    };

    const DashboardComponent = dashboardComponents[activeTask.type];
    return DashboardComponent ? <DashboardComponent/> : null;
};

export default Dashboard;