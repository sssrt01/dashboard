import React, {useState} from 'react';
import {Layout, Menu} from 'antd';
import {
    BarChartOutlined,
    ControlOutlined,
    LogoutOutlined,
    PlusCircleOutlined,
    ScheduleOutlined
} from '@ant-design/icons';
import {Link, Outlet, useLocation, useNavigate} from 'react-router-dom';
import authService from '../../services/authService';

const {Sider, Content} = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const menuItems = [
        {
            key: '/shifts',
            icon: <ScheduleOutlined/>,
            label: <Link to="/shifts">Список змін</Link>,
        },
        {
            key: '/shifts/new',
            icon: <PlusCircleOutlined/>,
            label: <Link to="/shifts/new">Створити зміну</Link>,
        },
        {
            key: '/shifts/control',
            icon: <ControlOutlined/>,
            label: <Link to="/shifts/control">Керування зміною</Link>,
        },
        {
            key: '/shifts/statistics',
            icon: <BarChartOutlined/>,
            label: <Link to="/shifts/statistics">Статистика</Link>,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined/>,
            label: 'Вийти',
            onClick: handleLogout,
            style: {marginTop: 'auto'},
            danger: true
        }
    ];
    return (
        <Layout style={{minHeight: '100vh'}}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
            >
                <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    />
                </div>
            </Sider>
            <Layout>
                <Content style={{margin: '24px 16px', padding: 24, minHeight: 280}}>
                    <Outlet/>
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;