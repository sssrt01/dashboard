import {Button, Space, Table, Tag, Typography} from 'antd';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {ClockCircleOutlined, EyeOutlined} from '@ant-design/icons';
import apiClient from "../../services/api.jsx";
import {compareDates, formatDateTime, PAGE_SIZE, STATUS_COLORS} from '../../constants/shifts';

const {Title} = Typography;

const StyledTag = styled(Tag)`
    border-radius: 4px;
    padding: 2px 8px;
    font-weight: 500;
`;

// Утиліти
const formatDate = (date) => date ? formatDateTime(date) : '—';

// Користувацький хук
const useShiftsData = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('table/');
            if (Array.isArray(response.data)) {
                setShifts(response.data);
            } else {
                throw new Error('Невірний формат даних');
            }
        } catch (err) {
            setError(err.message);
            console.error('Помилка завантаження даних:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    return {shifts, loading, error};
};

// Конфігурація колонок
const getTableColumns = (onView) => [
    {
        title: 'ID',
        dataIndex: 'id',
        width: 80,
        sorter: (a, b) => a.id - b.id,
        align: 'center',
    },
    {
        title: 'Статус',
        dataIndex: 'status',
        width: 120,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status) => (
            <StyledTag color={STATUS_COLORS[status] || 'default'}>{status}</StyledTag>
        ),
        align: 'center',
    },
    {
        title: 'Планований початок',
        dataIndex: 'planned_start_time',
        width: 180,
        sorter: (a, b) => compareDates(a.planned_start_time, b.planned_start_time),
        render: formatDate,
        align: 'center',
    },
    {
        title: 'Початок',
        dataIndex: 'start_time',
        width: 180,
        sorter: (a, b) => compareDates(a.start_time, b.start_time),
        render: formatDate,
        align: 'center',
    },
    {
        title: 'Закінчення',
        dataIndex: 'end_time',
        width: 180,
        sorter: (a, b) => compareDates(a.end_time, b.end_time),
        render: formatDate,
        align: 'center',
    },
    {
        title: 'Майстер',
        dataIndex: 'master_name',
        sorter: (a, b) => a.master_name.localeCompare(b.master_name),
    },
    {
        title: 'Дії',
        key: 'actions',
        width: 100,
        render: (_, record) => (
            <Button
                type="link"
                icon={<EyeOutlined/>}
                onClick={() => onView(record.id)}
            >
                Деталі
            </Button>
        ),
        align: 'center',
    },
];

export default function ShiftList() {
    const navigate = useNavigate();
    const {shifts, loading, error} = useShiftsData();

    const handleView = (id) => navigate(`/shifts/${id}`);

    if (error) {
        return <div>Помилка завантаження даних: {error}</div>;
    }

    return (
        <>
            <Space align="center" style={{marginBottom: 16}}>
                <ClockCircleOutlined style={{fontSize: 24, color: '#1890ff'}}/>
                <Title level={4} style={{margin: 0}}>Список змін</Title>
            </Space>
            <Table
                columns={getTableColumns(handleView)}
                dataSource={shifts}
                rowKey="id"
                loading={loading}
                bordered
                size="middle"
                pagination={{
                    pageSize: PAGE_SIZE.SMALL,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Всього ${total} записів`,
                }}
                scroll={{x: 'max-content'}}
            />
        </>
    );
}