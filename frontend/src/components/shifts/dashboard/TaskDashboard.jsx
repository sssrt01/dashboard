import React, {useContext} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import ShiftContext from "../../../services/ShiftContext.jsx";
import formatTime from "../../../FormatTime.jsx";
import Clock from "../../Clock.jsx";

const LABELS = {
  loading: "Загрузка...",
  completed: "Виконано",
  target: "Ціль",
  difference: "Різниця"
};

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

const MiddleSection = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const BottomSection = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 50px;
  background-color: #f0f0f0;
  border-top: 2px solid #dee2e6;
`;

const MetricCard = ({label, value}) => (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
      <p style={{margin: 0, fontSize: "2.5rem", color: "#666"}}>{label}</p>
      <p style={{margin: 0, fontSize: "4rem", fontWeight: "bold"}}>{value}</p>
    </div>
);

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

const TaskDashboard = () => {
  const {shift, activeTask} = useContext(ShiftContext);

  if (!shift || !activeTask) {
    return <div>{LABELS.loading}</div>;
  }

  return (
      <Container>
        <TopSection>
          <div style={{padding: "10px", textAlign: "center", minWidth: "120px", flexShrink: 0}}>
          <Clock />
        </div>
          <ShiftInfo>
            <p style={{margin: 0, fontSize: "1rem", color: "#777"}}>{shift.name}</p>
            <h1 style={{margin: 0, fontSize: "2rem", fontWeight: "bold"}}>{activeTask.product}</h1>
            <h2 style={{margin: "5px 0", fontSize: "2rem", color: "#555"}}>{activeTask.packing} л</h2>
          </ShiftInfo>
        </TopSection>

        <MiddleSection>
          <h1 style={{fontSize: "5rem", fontWeight: "bold"}}>
            {formatTime(activeTask.time_spent)}
          </h1>
        </MiddleSection>

        <BottomSection>
          <MetricCard label={LABELS.completed} value={activeTask.ready_value}/>
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