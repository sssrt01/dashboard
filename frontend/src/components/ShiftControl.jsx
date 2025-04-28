import React, {useContext, useEffect, useMemo, useState} from 'react';
import {Alert, Button, Card, Descriptions, Modal, Space, Spin, Tag, Timeline} from 'antd';
import {QuestionCircleOutlined} from '@ant-design/icons';
import ShiftContext from '../services/ShiftContext';
import moment from 'moment';
import apiClient from "../services/api.jsx";

const ShiftManagement = () => {
  const { shift, activeTask, setShift, setActiveTask } = useContext(ShiftContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNextConfirm, setShowNextConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(moment());

  useEffect(() => {
    const fetchActiveShift = async () => {
      try {
        const response = await apiClient.get('shift/active/');
        const shiftData = response.data;

        // Используем shifttask_set вместо tasks
        const tasks = shiftData.shifttask_set || [];
        const sortedTasks = tasks.sort((a, b) => a.order - b.order);
        const currentTask = sortedTasks.find(t => t.id === shiftData.active_task);

        setShift({ ...shiftData, tasks: sortedTasks });
        setActiveTask(currentTask || null);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };

    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);

    fetchActiveShift();

    return () => {
      clearInterval(timer);
    };
  }, []);

  const tasks = useMemo(() => {
    return shift?.tasks || [];
  }, [shift]);

  const currentIndex = useMemo(() => {
    return tasks.findIndex(task => task.id === activeTask?.id);
  }, [tasks, activeTask]);

  const shiftDuration = useMemo(() => {
    if (!shift?.start_time) return '00:00';

    const start = moment(shift.start_time);
    if (!start.isValid()) return '00:00';

    const duration = moment.duration(currentTime.diff(start));
    return `${Math.floor(duration.asHours()).toString().padStart(2, '0')}:${
      duration.minutes().toString().padStart(2, '0')}`;
  }, [shift, currentTime]);

  const handleAction = async (actionType) => {
    try {
      await apiClient.patch('shift/increment-active-task/');
    } catch (error) {
      console.error('Помилка дії:', error);
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

const renderTaskDetails = () => {
  if (!activeTask) return null;
  return (
    <Descriptions bordered column={1}>
      <Descriptions.Item label="Тип завдання">
        <Tag color={activeTask.type === 'TASK' ? 'blue' : 'orange'}>
          {activeTask.type}
        </Tag>
      </Descriptions.Item>
      {activeTask.type === 'TASK' && (
        <>
          <Descriptions.Item label="Інформація">
            {activeTask.product}
            {activeTask.packing && ` ${activeTask.packing} л`}
            {activeTask.target && ` ${activeTask.target} шт`}
          </Descriptions.Item>
          <Descriptions.Item label="Виконано часу">
            {moment.utc(activeTask.time_spent * 1000).format('HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Прогрес">
            {activeTask.ready_value || 0}/{activeTask.target}
          </Descriptions.Item>
        </>
      )}
      {activeTask.type === 'BREAK' && (
        <Descriptions.Item label="Залишилось часу">
          {moment.utc(activeTask.remaining_time * 1000).format('HH:mm')}
        </Descriptions.Item>
      )}
      <Descriptions.Item label="Початок">
        {moment(activeTask.started_at).format('DD.MM.YYYY HH:mm')}
      </Descriptions.Item>
    </Descriptions>
  );
};
  if (loading) {
    return <Spin tip="Завантаження даних зміни..." size="large" />;
  }

  if (error) {
    return (
      <Alert
        message="Помилка завантаження"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  if (!shift) {
    return (
      <Alert
        message="Немає активної зміни"
        description="Наразі немає активних змін для керування"
        type="info"
        showIcon
      />
    );
  }

  return (
    <div className="shift-management">
      <Card
          title={`Зміна #${shift.id}`}
        extra={
          <Space>
            <Tag>{currentTime.format('DD.MM.YYYY HH:mm')}</Tag>
            <Tag color={shift.status === 'ACTIVE' ? 'green' : 'red'}>
              {shift.status}
            </Tag>
          </Space>
        }
      >
        <Descriptions bordered>
          <Descriptions.Item label="Початок зміни">
            {moment(shift.start_time).format('DD.MM.YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Тривалість зміни">
            {shiftDuration}
          </Descriptions.Item>
          <Descriptions.Item label="Прогрес зміни">
            {currentIndex + 1} / {tasks.length}
          </Descriptions.Item>
        </Descriptions>

        <div className="current-task" style={{ margin: '24px 0' }}>
          <h3>Поточне завдання</h3>
          {activeTask ? (
            <Card type="inner" title={`Завдання #${activeTask.order + 1}`}>
              {renderTaskDetails()}
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

      <Modal
        title="Підтвердження переходу"
        open={showNextConfirm}
        onOk={() => {
          handleAction('next_task');
          setShowNextConfirm(false);
        }}
        onCancel={() => setShowNextConfirm(false)}
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
        open={showEndConfirm}
        onOk={() => {
          handleAction('complete_shift');
          setShowEndConfirm(false);
        }}
        onCancel={() => setShowEndConfirm(false)}
        okText="Завершити"
        cancelText="Скасувати"
        okButtonProps={{ danger: true }}
      >
        <p>Ви впевнені, що хочете завершити поточну зміну?</p>
        <Alert
          message="Всі незавершені завдання будуть скасовані"
          type="error"
          showIcon
        />
      </Modal>
    </div>
  );
};

export default ShiftManagement;