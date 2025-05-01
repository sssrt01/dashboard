import React, {useContext, useEffect, useMemo, useState} from 'react';
import {Alert, Button, Card, Descriptions, Modal, Space, Spin, Tag, Timeline} from 'antd';
import {QuestionCircleOutlined} from '@ant-design/icons';
import ShiftContext from '../services/ShiftContext';
import moment from 'moment';
import apiClient from "../services/api.jsx";
import PropTypes from 'prop-types';

const TASK_TYPES = {
  TASK: 'TASK',
  BREAK: 'BREAK'
};

const TASK_COLORS = {
  [TASK_TYPES.TASK]: 'blue',
  [TASK_TYPES.BREAK]: 'orange'
};

const useShiftData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const {setShift, setActiveTask} = useContext(ShiftContext);

  const fetchActiveShift = async () => {
    try {
      const response = await apiClient.get('shift/active/');
      const shiftData = response.data;
      const sortedTasks = (shiftData.shifttask_set || []).sort((a, b) => a.order - b.order);
      const currentTask = sortedTasks.find(t => t.id === shiftData.active_task);

      setShift({...shiftData, tasks: sortedTasks});
      setActiveTask(currentTask || null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return {loading, error, fetchActiveShift};
};

const useTimer = () => {
  const [currentTime, setCurrentTime] = useState(moment());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(moment()), 1000);
    return () => clearInterval(timer);
  }, []);

  return currentTime;
};

const TaskDetails = ({task}) => {
  if (!task) return null;

  return (
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Тип завдання">
          <Tag color={TASK_COLORS[task.type]}>{task.type}</Tag>
        </Descriptions.Item>
        {task.type === TASK_TYPES.TASK && (
            <>
              <Descriptions.Item label="Інформація">
                {task.product}
                {task.packing && ` ${task.packing} л`}
                {task.target && ` ${task.target} шт`}
              </Descriptions.Item>
              <Descriptions.Item label="Виконано часу">
                {moment.utc(task.time_spent * 1000).format('HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Прогрес">
                {task.ready_value || 0}/{task.target}
              </Descriptions.Item>
            </>
        )}
        {task.type === TASK_TYPES.BREAK && (
            <Descriptions.Item label="Залишилось часу">
              {moment.utc(task.remaining_time * 1000).format('HH:mm')}
            </Descriptions.Item>
        )}
        <Descriptions.Item label="Початок">
          {moment(task.started_at).format('DD.MM.YYYY HH:mm')}
        </Descriptions.Item>
      </Descriptions>
  );
};

const ConfirmationModals = ({showNext, showEnd, onNext, onEnd, onClose}) => (
    <>
      <Modal
          title="Підтвердження переходу"
          open={showNext}
          onOk={() => {
            onNext();
            onClose();
          }}
          onCancel={onClose}
          okText="Підтвердити"
          cancelText="Скасувати"
      >
        <p>Ви впевнені, що хочете перейти до наступного завдання?</p>
        <Alert
            message="Поточне завдання буде завершено достроково"
            type="warning"
            showIcon
        />
      </Modal>
      <Modal
          title="Підтвердження завершення"
          open={showEnd}
          onOk={() => {
            onEnd();
            onClose();
          }}
          onCancel={onClose}
          okText="Завершити"
          cancelText="Скасувати"
          okButtonProps={{danger: true}}
      >
        <p>Ви впевнені, що хочете завершити поточну зміну?</p>
        <Alert
            message="Всі незавершені завдання будуть скасовані"
            type="error"
            showIcon
        />
      </Modal>
    </>
);

ConfirmationModals.propTypes = {
  showNext: PropTypes.bool.isRequired,
  showEnd: PropTypes.bool.isRequired,
  onNext: PropTypes.func.isRequired,
  onEnd: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

const ShiftManagement = () => {
  const {shift, activeTask} = useContext(ShiftContext);
  const [showNextConfirm, setShowNextConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const {loading, error, fetchActiveShift} = useShiftData();
  const currentTime = useTimer();

  useEffect(() => {
    fetchActiveShift();
  }, []);

  const tasks = useMemo(() => shift?.tasks || [], [shift]);
  const currentIndex = useMemo(() =>
      tasks.findIndex(task => task.id === activeTask?.id), [tasks, activeTask]);

  const shiftDuration = useMemo(() => {
    if (!shift?.start_time) return '00:00';
    const start = moment(shift.start_time);
    if (!start.isValid()) return '00:00';
    const duration = moment.duration(currentTime.diff(start));
    return `${Math.floor(duration.asHours()).toString().padStart(2, '0')}:${
      duration.minutes().toString().padStart(2, '0')}`;
  }, [shift, currentTime]);

  const handleAction = async () => {
    try {
      await apiClient.patch('shift/increment-active-task/');
    } catch (error) {
      Modal.error({
        title: 'Помилка',
        content: error.response?.data?.detail || 'Невідома помилка',
      });
    }
  };

  const timelineItems = useMemo(() => {
    return tasks.map((task, index) => ({
      color: index === currentIndex ? 'blue' : index < currentIndex ? 'green' : 'gray',
      label: task.type === "TASK"
          ? `${task.product.name} ${task.packing.value} л ${task.target} шт`
          : task.type === "BREAK"
              ? "Перерва"
              : "Перерва",
      children: (
        <div style={{ opacity: index < currentIndex ? 0.6 : 1 }}>
          <Tag color={task.type === 'TASK' ? 'blue' : 'orange'}>
            {task.type}
          </Tag>
          {index === currentIndex && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              Активно
            </Tag>
          )}
        </div>
      )
    }));
  }, [tasks, currentIndex]);

  if (loading) return <Spin tip="Завантаження даних зміни..." size="large"/>;
  if (error) return <Alert message="Помилка завантаження" description={error} type="error" showIcon/>;
  if (!shift) return <Alert message="Немає активної зміни" description="Наразі немає активних змін для керування"
                            type="info" showIcon/>;

  return (
    <div className="shift-management">
      <Card
          title={`Зміна #${shift.id}`}
        extra={
          <Space>
            <Tag>{currentTime.format('DD.MM.YYYY HH:mm')}</Tag>
            <Tag color={shift.status === 'ACTIVE' ? 'green' : 'red'}>{shift.status}</Tag>
          </Space>
        }
      >
        <Descriptions bordered>
          <Descriptions.Item label="Початок зміни">
            {moment(shift.start_time).format('DD.MM.YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Тривалість зміни">{shiftDuration}</Descriptions.Item>
          <Descriptions.Item label="Прогрес зміни">
            {currentIndex + 1} / {tasks.length}
          </Descriptions.Item>
        </Descriptions>

        <div className="current-task" style={{ margin: '24px 0' }}>
          <h3>Поточне завдання</h3>
          {activeTask ? (
            <Card type="inner" title={`Завдання #${activeTask.order + 1}`}>
              <TaskDetails task={activeTask}/>
            </Card>
          ) : (
            <Alert message="Немає активного завдання" type="warning" showIcon />
          )}
        </div>

        <div className="tasks-timeline">
          <h3>План зміни</h3>
          <Timeline mode="alternate" items={timelineItems} />
        </div>

        <div className="action-buttons" style={{ marginTop: 24 }}>
          <Button
            type="primary"
            onClick={() => setShowNextConfirm(true)}
            disabled={!activeTask || currentIndex >= tasks.length - 1}
            style={{ marginRight: 16 }}
          >
            Наступне завдання
          </Button>
          <Button
            danger
            onClick={() => setShowEndConfirm(true)}
            icon={<QuestionCircleOutlined />}
          >
            Завершити зміну
          </Button>
        </div>
      </Card>

      <ConfirmationModals
          showNext={showNextConfirm}
          showEnd={showEndConfirm}
          onNext={() => handleAction('next_task')}
          onEnd={() => handleAction('complete_shift')}
          onClose={() => {
          setShowNextConfirm(false);
          setShowEndConfirm(false);
        }}
      />
    </div>
  );
};

export default ShiftManagement;