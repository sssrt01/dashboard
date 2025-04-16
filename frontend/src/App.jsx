import ShiftProvider from "./components/ShiftProvider.jsx";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import AdminPage from "./components/ShiftDisplay.jsx";
import LoginPage from "./components/login/LoginPage.jsx";
import ProtectedRoute from "./components/login/LoginProvider.jsx";
import 'antd/dist/reset.css';
import Dashboard from "./components/shifts/dashboard/Dashboard.jsx";

function App() {

    return (
        <>
            <ShiftProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage/>}/>
                        <Route path="/" element={<Dashboard/>}/>
                        <Route path="/admin" element={
                            <ProtectedRoute>
                                <AdminPage/>
                            </ProtectedRoute>}
                        />
                    </Routes>
                </BrowserRouter>
            </ShiftProvider>
        </>
    )
}

export default App
