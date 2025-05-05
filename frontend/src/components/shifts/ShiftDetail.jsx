import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {Button, Card, Descriptions, Divider, Modal, Spin, Table, Tag} from 'antd';
import {DeleteOutlined} from '@ant-design/icons';
import PropTypes from 'prop-types';
import apiClient from "../../services/api.jsx";
import {
    DATE_TIME_SHORT_FORMAT,
    EMPTY_VALUE,
    formatDateTime,
    formatValue,
    PAGE_SIZE,
    STATUS_COLORS
} from '../../constants/shifts';


const ShiftDescription = ({shift}) => (
    <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Статус">
            <Tag color={STATUS_COLORS[shift.status]}>{shift.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Майстер">{shift.master.name}</Descriptions.Item>
        <Descriptions.Item label="Розпочав">{shift.user_starts?.username ?? EMPTY_VALUE}</Descriptions.Item>
        <Descriptions.Item label="Завершив">{shift.user_ends?.username ?? EMPTY_VALUE}</Descriptions.Item>
        <Descriptions.Item label="Планований початок">
            {formatDateTime(shift.planned_start_time, DATE_TIME_SHORT_FORMAT)}
        </Descriptions.Item>
        <Descriptions.Item label="Фактичний початок">
            {formatDateTime(shift.start_time)}
        </Descriptions.Item>
        <Descriptions.Item label="Фактичне закінчення">
            {formatDateTime(shift.end_time)}
        </Descriptions.Item>
    </Descriptions>
);

ShiftDescription.propTypes = {
    shift: PropTypes.shape({
        status: PropTypes.string.isRequired,
        master: PropTypes.shape({
            name: PropTypes.string.isRequired
        }).isRequired,
        user_starts: PropTypes.shape({
            username: PropTypes.string
        }),
        user_ends: PropTypes.shape({
            username: PropTypes.string
        }),
        planned_start_time: PropTypes.string,
        start_time: PropTypes.string,
        end_time: PropTypes.string
    }).isRequired
};

const TasksTable = ({tasks}) => {
    const taskColumns = [
        {title: 'ID', dataIndex: 'id', width: 60},
        {title: 'Тип', dataIndex: 'type'},
        {title: 'Залишилось (сек)', dataIndex: 'remaining_time'},
        {title: 'Порядок', dataIndex: 'order'},
        {title: 'Продукт', dataIndex: ['product', 'name']},
        {
            title: 'Пакування (л)',
            dataIndex: ['packing', 'value'],
            render: val => formatValue(val, v => `${v} л`)
        },
        {title: 'Ціль', dataIndex: 'target'},
        {title: 'Готово', dataIndex: 'ready_value'},
        {title: 'Норма/хв', dataIndex: 'norm_in_minute'},
        {
            title: 'Витрачено (хв)',
            dataIndex: 'time_spent',
            render: val => formatValue(val, v => `${(v / 60).toFixed(1)} хв`)
        },
        {
            title: '% від зміни',
            dataIndex: 'percent_from_shift',
            render: val => formatValue(val, v => `${v.toFixed(1)}%`)
        },
        {
            title: 'Розпочато',
            dataIndex: 'started_at',
            render: dt => formatDateTime(dt)
        },
        {
            title: 'Завершено',
            dataIndex: 'finished_at',
            render: dt => formatDateTime(dt)
        }
    ];

    return (
        <Table
            rowKey="id"
            dataSource={tasks}
            columns={taskColumns}
            bordered
            size="small"
            pagination={PAGE_SIZE.DEFAULT}
        />
    );
};

export default function ShiftDetail() {
    const {id} = useParams();
    const navigate = useNavigate();
    const [shift, setShift] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ... остальные useEffect и функции остаются без изменений ...

    useEffect(() => {
        apiClient
            .get(`shifts_detail/${id}/`)
            .then(res => {
                setShift(res.data);
                setTasks(res.data.shifttask_set);
                setError(null);
            })
            .catch(err => {
                console.error(err);
                setError('Помилка при завантаженні даних зміни');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);


    const handleDelete = () => {
        Modal.confirm({
            title: 'Підтвердження видалення',
            content: 'Ви дійсно хочете видалити цю зміну?',
            okText: 'Так, видалити',
            okType: 'danger',
            cancelText: 'Скасувати',
            onOk: () => {
                setLoading(true);
                apiClient
                    .delete(`shifts/${id}/`)
                    .then(() => {
                        navigate('/shifts');
                    })
                    .catch((error) => {
                        Modal.error({
                            title: 'Помилка',
                            content: error.response?.data?.detail || 'Не вдалося видалити зміну'
                        });
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            }
        });
    };

    if (loading) return <Spin style={{margin: 50}}/>;
    if (error) return <div>{error}</div>;
    if (!shift) return <div>Зміну з ID {id} не знайдено.</div>;

    const extraButtons = (
        <>
            {shift.status === 'PLANNED' && (
                <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined/>}
                    onClick={handleDelete}
                    style={{marginRight: 8}}
                >
                    Видалити
                </Button>
            )}
            <Button onClick={() => navigate(-1)}>Назад</Button>
        </>
    );

    return (
        <Card
            title={`Зміна #${shift.id}`}
            extra={extraButtons}
        >
            <ShiftDescription shift={shift}/>
            <Divider/>
            <TasksTable tasks={tasks}/>
        </Card>
    );
}