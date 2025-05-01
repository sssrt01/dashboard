import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Clock from "../../Clock.jsx";
import formatTime from "../../../FormatTime.jsx";
import ShiftContext from "../../../services/ShiftContext.jsx";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: Arial, sans-serif;
    background-color: #fff;
    color: #333;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background-color: #f8f9fa;
    border-bottom: 2px solid #dee2e6;
`;

const ClockWrapper = styled.div`
    padding: 10px;
    text-align: center;
    min-width: 120px;
`;

const BreakInfo = styled.div`
    text-align: center;
    flex: 1;
`;

const BreakTitle = styled.h1`
    margin: 0;
    font-size: 2rem;
    font-weight: bold;
`;

const TimerContainer = styled.div`
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Timer = styled.h1`
    font-size: 5rem;
    font-weight: bold;
`;

const BreakTimer = () => {
    const {activeTask} = React.useContext(ShiftContext);

    return (
        <Container>
            <Header>
                <ClockWrapper>
                    <Clock/>
                </ClockWrapper>
                <BreakInfo>
                    <BreakTitle>Перерва</BreakTitle>
                </BreakInfo>
            </Header>
            <TimerContainer>
                <Timer>{formatTime(activeTask.remaining_time)}</Timer>
            </TimerContainer>
        </Container>
    );
};

BreakTimer.propTypes = {
    activeTask: PropTypes.shape({
        remaining_time: PropTypes.number.isRequired,
    }),
};

export default BreakTimer;