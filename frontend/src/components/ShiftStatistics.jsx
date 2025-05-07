import React, {useEffect, useState} from 'react';
import {Card, Progress, Space, Table, theme, Typography} from 'antd';
import {CheckCircleOutlined, GroupOutlined} from '@ant-design/icons';
import moment from 'moment';
import apiClient from "../services/api.jsx";

const {Title} = Typography;
const {useToken} = theme;

const ShiftsStatistics = () => {
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(true);
    const {token} = useToken();

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const response = await apiClient.get('statistics/');
                setStatistics(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Помилка при завантаженні статистики:', error);
                setStatistics([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStatistics();
    }, []);

    const progressStyle = {
        success: {
            color: token.colorSuccess,
            backgroundColor: token.colorSuccessBg
        },
        normal: {
            color: token.colorPrimary,
            backgroundColor: token.colorBgContainer
        }
    };

    const columns = [
        {
            title: 'Майстер',
            dataIndex: 'master_name',
            key: 'master_name',
            width: '30%',
        },
        {
            title: 'Всього змін',
            dataIndex: 'total_shifts',
            key: 'total_shifts',
            width: '30%',
            sorter: (a, b) => a.total_shifts - b.total_shifts,
        },
        {
            title: 'Середній відсоток виконання',
            dataIndex: 'avg_completion',
            key: 'avg_completion',
            width: '40%',
            render: (value) => (
                <Progress
                    type="circle"
                    percent={value}
                    width={50}
                    status={value >= 100 ? 'success' : 'normal'}
                    strokeColor={value >= 100 ? progressStyle.success.color : progressStyle.normal.color}
                />
            ),
            sorter: (a, b) => a.avg_completion - b.avg_completion,
        },
    ];

    const shiftsColumns = [
        {
            title: 'Початок зміни',
            dataIndex: 'start_time',
            key: 'start_time',
            render: (text) => text ? moment(text).format('DD.MM.YYYY HH:mm') : '-',
        },
        {
            title: 'Кінець зміни',
            dataIndex: 'end_time',
            key: 'end_time',
            render: (text) => text ? moment(text).format('DD.MM.YYYY HH:mm') : '-',
        },
        {
            title: 'Виконання зміни',
            dataIndex: 'avg_completion',
            key: 'avg_completion',
            render: (value) => (
                <Progress
                    type="circle"
                    percent={value}
                    width={50}
                    status={value >= 100 ? 'success' : 'normal'}
                    strokeColor={value >= 100 ? progressStyle.success.color : progressStyle.normal.color}
                />
            ),
        },
        {
            title: 'Кількість завдань',
            dataIndex: 'tasks_count',
            key: 'tasks_count',
        },
    ];

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
            title: 'Виконання',
            dataIndex: 'completion_percent',
            key: 'completion_percent',
            render: (value) => (
                <Progress
                    percent={value}
                    size="small"
                    status={value >= 100 ? 'success' : 'normal'}
                    strokeColor={value >= 100 ? progressStyle.success.color : progressStyle.normal.color}
                />
            ),
        },
    ];

    const expandedRowRender = (record) => (
        <Card
            size="small"
            bordered={false}
            style={{backgroundColor: token.colorBgContainer}}
        >
            <Table
                columns={shiftsColumns}
                dataSource={record.shifts_details}
                pagination={false}
                expandable={{
                    expandedRowRender: (shift) => (
                        <Table
                            columns={taskColumns}
                            dataSource={shift.tasks_details}
                            pagination={false}
                            rowKey={(record) => `${record.product_name}-${record.target}`}
                        />
                    ),
                }}
                rowKey="shift_id"
            />
        </Card>
    );

    return (
        <Space direction="vertical" style={{width: '100%', padding: token.padding}} size="large">
            <Title level={2} style={{margin: 0}}>
                <GroupOutlined style={{marginRight: token.marginSM}}/>
                Статистика по майстрам
            </Title>
            <Table
                columns={columns}
                dataSource={statistics}
                loading={loading}
                expandable={{
                    expandedRowRender,
                    expandIcon: ({expanded, onExpand, record}) => (
                        expanded ? (
                            <CheckCircleOutlined
                                onClick={e => onExpand(record, e)}
                                style={{color: token.colorPrimary}}
                            />
                        ) : (
                            <GroupOutlined
                                onClick={e => onExpand(record, e)}
                                style={{color: token.colorPrimary}}
                            />
                        )
                    ),
                }}
                rowKey="master_id"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Всього майстрів: ${total}`,
                }}
            />
        </Space>
    );
};

export default ShiftsStatistics;