import React, {useEffect, useState} from 'react';
import {Card, Progress, Space, Table, Typography} from 'antd';
import {CheckCircleOutlined, GroupOutlined} from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';

const {Title} = Typography;

const ShiftsStatistics = () => {
    const [statistics, setStatistics] = useState([]); // Инициализируем как пустой массив
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const response = await axios.get('/api/shifts/statistics/');
                setStatistics(response.data || []); // Убедимся, что всегда устанавливаем массив
            } catch (error) {
                console.error('Ошибка при загрузке статистики:', error);
                setStatistics([]); // В случае ошибки устанавливаем пустой массив
            } finally {
                setLoading(false);
            }
        };

        fetchStatistics();
    }, []);

    const columns = [
        {
            title: 'Мастер',
            dataIndex: 'master_name',
            key: 'master_name',
            filters: Array.from(new Set(statistics.map(item => item?.master_name)))
                .filter(Boolean)
                .map(name => ({
                    text: name,
                    value: name,
                })),
            onFilter: (value, record) => record.master_name === value,
        },
        {
            title: 'Начало смены',
            dataIndex: 'start_time',
            key: 'start_time',
            render: (text) => moment(text).format('DD.MM.YYYY HH:mm'),
            sorter: (a, b) => moment(a.start_time).unix() - moment(b.start_time).unix(),
        },
        {
            title: 'Окончание смены',
            dataIndex: 'end_time',
            key: 'end_time',
            render: (text) => moment(text).format('DD.MM.YYYY HH:mm'),
        },
        {
            title: 'Выполнение смены',
            dataIndex: 'avg_completion',
            key: 'avg_completion',
            render: (value) => (
                <Progress
                    type="circle"
                    percent={value}
                    width={50}
                    status={value >= 100 ? 'success' : 'normal'}
                />
            ),
            sorter: (a, b) => a.avg_completion - b.avg_completion,
        },
        {
            title: 'Кол-во заданий',
            dataIndex: 'tasks_count',
            key: 'tasks_count',
        },
    ];

    const expandedRowRender = (record) => {
        const taskColumns = [
            {
                title: 'Продукт',
                dataIndex: 'product_name',
                key: 'product_name',
            },
            {
                title: 'План',
                dataIndex: 'target',
                key: 'target',
            },
            {
                title: 'Факт',
                dataIndex: 'completed',
                key: 'completed',
            },
            {
                title: 'Выполнение',
                dataIndex: 'completion_percent',
                key: 'completion_percent',
                render: (value) => (
                    <Progress
                        percent={value}
                        size="small"
                        status={value >= 100 ? 'success' : 'normal'}
                    />
                ),
            },
        ];

        return (
            <Card size="small">
                <Table
                    columns={taskColumns}
                    dataSource={record.tasks_details}
                    pagination={false}
                    rowKey={(record) => `${record.product_name}-${record.target}`}
                />
            </Card>
        );
    };

    return (
        <Space direction="vertical" style={{width: '100%'}} size="large">
            <Title level={2}>
                <GroupOutlined/> Статистика по сменам
            </Title>
            <Table
                columns={columns}
                dataSource={statistics}
                loading={loading}
                expandable={{
                    expandedRowRender,
                    expandIcon: ({expanded, onExpand, record}) => (
                        expanded ? (
                            <CheckCircleOutlined onClick={e => onExpand(record, e)}/>
                        ) : (
                            <GroupOutlined onClick={e => onExpand(record, e)}/>
                        )
                    ),
                }}
                rowKey="shift_id"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Всего смен: ${total}`,
                }}
            />
        </Space>
    );
};

export default ShiftsStatistics;