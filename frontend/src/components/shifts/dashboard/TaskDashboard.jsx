import React, {useContext, useEffect, useState} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import ShiftContext from "../../../services/ShiftContext.jsx";
import formatTime from "../../../FormatTime.jsx";
import Clock from "../../Clock.jsx";
import {Progress, Typography} from "antd";

const LABELS = {
    loading: "Загрузка...",
    completed: "Виконано",
    target: "Ціль",
    difference: "Різниця"
};
const {Title} = Typography;


const PerformanceIndicatorSmall = styled.div`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-left: 10px;
    background-color: ${props => props.status === 'success' ? '#52c41a' : '#ff4d4f'};
`;

const MetricContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const MetricHeader = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 5px;
`;


const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: Arial, sans-serif;
  background-color: #fff;
  color: #333;
`;

const TopSection = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  padding: 5px;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
`;

const ShiftInfo = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  white-space: nowrap;
`;

const PerformanceIndicator = styled.div`
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
`;

const MiddleSection = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
    flex-direction: column;
`;

const EstimatedTime = styled.div`
    text-align: center;
    margin-top: 10px;
    font-size: 1.2rem;
    color: #666;
`;

const BottomSection = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 50px;
  background-color: #f0f0f0;
  border-top: 2px solid #dee2e6;
`;

const Timer = styled.h1`
    font-size: 5rem;
    font-weight: bold;
    margin-bottom: 0;
    color: ${props => props.performance >= 95 ? '#000' : '#ff4d4f'};
`;


const TaskTime = styled.div`
    text-align: center;
    margin-top: 10px;
    font-size: 1.2rem;
    color: #666;
`;


const MetricCard = ({label, value, showIndicator, performance}) => (
    <MetricContainer>
        <MetricHeader>
            <p style={{margin: 0, fontSize: "2.5rem", color: "#666"}}>{label}</p>
            {showIndicator && (
                <PerformanceIndicatorSmall
                    status={performance >= 95 ? 'success' : 'error'}
                    title={performance >= 95 ? 'Встигають' : 'Відстають'}
                />
            )}
        </MetricHeader>
        <p style={{margin: 0, fontSize: "4rem", fontWeight: "bold"}}>{value}</p>
    </MetricContainer>
);


MetricCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

const TaskDashboard = () => {
    const {activeTask, shift} = useContext(ShiftContext);
    const [performance, setPerformance] = useState({
        current: 0,
        expected: 0,
        actual: 0
    });

    useEffect(() => {
        if (activeTask) {
            const calculatePerformance = () => {
                const startTime = new Date(activeTask.started_at).getTime();
                const currentTime = new Date().getTime();
                const timeElapsedMinutes = (currentTime - startTime) / (1000 * 60);

                const expectedPerMinute = parseFloat(activeTask.norm_in_minute) || 0;
                const expectedCount = timeElapsedMinutes * expectedPerMinute;
                const actualCount = parseInt(activeTask.ready_value) || 0;

                const performancePercent = expectedCount > 0
                    ? (actualCount / expectedCount) * 100
                    : 0;

                setPerformance({
                    current: performancePercent,
                    expected: expectedCount,
                    actual: actualCount
                });
            };

            calculatePerformance();
            const intervalId = setInterval(calculatePerformance, 1000);
            return () => clearInterval(intervalId);
        }
    }, [activeTask]);


    const calculateTotalTime = () => {
        if (!activeTask) return "";
        const totalItems = activeTask.target;
        const timePerItem = 1 / (parseFloat(activeTask.norm_in_minute) || 1);
        const totalMinutes = totalItems * timePerItem;
        return `Загальний час: ${formatTimeInMinutes(totalMinutes)}`;
    };


    const getPerformanceStatus = (percent) => {
        if (percent >= 95) return "success";
        return "exception";
    };

    const formatTimeInMinutes = (minutes) => {
        if (!minutes) return '0 хв';

        if (minutes < 60) {
            return `${Math.ceil(minutes)} хв`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.ceil(minutes % 60);

        if (remainingMinutes === 0) {
            return `${hours} год`;
        }

        return `${hours} год ${remainingMinutes} хв`;
    };


    const calculateEstimatedTime = () => {
        if (!activeTask) return "";
        const remaining = activeTask.target - activeTask.ready_value;
        const timePerItem = 1 / (parseFloat(activeTask.norm_in_minute) || 1);
        const estimatedMinutes = remaining * timePerItem;
        return `Розрахунковий час: ${formatTimeInMinutes(estimatedMinutes)}`;
    };

    if (!activeTask || !shift) {
        return <div>Загрузка...</div>;
    }

    return (
        <Container>
            <TopSection>
                <div style={{padding: "10px", textAlign: "center", minWidth: "120px", flexShrink: 0}}>
                    <Clock/>
                </div>
                <ShiftInfo>
                    <p style={{margin: 0, fontSize: "1rem", color: "#777"}}>
                        {shift.master_name || 'Зміна'}
                    </p>
                    <h1 style={{margin: 0, fontSize: "2rem", fontWeight: "bold"}}>
                        {activeTask.product || 'Продукт'}
                    </h1>
                    <h2 style={{margin: "5px 0", fontSize: "2rem", color: "#555"}}>
                        {activeTask.packing || '0'} л
                    </h2>
                </ShiftInfo>
                <PerformanceIndicator>
                    <Progress
                        type="circle"
                        percent={Math.round(performance.current)}
                        status={getPerformanceStatus(performance.current)}
                        format={percent => `${percent}%`}
                        size={80}
                    />
                </PerformanceIndicator>
            </TopSection>

            <MiddleSection>
                <Timer performance={performance.current}>
                    {formatTime(activeTask.time_spent)}
                </Timer>
                <TaskTime>
                    <div>{calculateEstimatedTime()}</div>
                    <div>{calculateTotalTime()}</div>
                </TaskTime>
            </MiddleSection>


            <BottomSection>
                <MetricCard
                    label={LABELS.completed}
                    value={activeTask.ready_value}
                    showIndicator={false}
                    performance={performance.current}
                />
                <MetricCard label={LABELS.target} value={activeTask.target}/>
                <MetricCard
                    label={LABELS.difference}
                    value={activeTask.ready_value - activeTask.target}
                />
            </BottomSection>

        </Container>
    );
};

export default TaskDashboard;