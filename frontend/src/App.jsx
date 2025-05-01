import ShiftProvider from "./components/ShiftProvider.jsx";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import LoginPage from "./components/login/LoginPage.jsx";
import ProtectedRoute from "./components/login/LoginProvider.jsx";
import 'antd/dist/reset.css';
import ShiftDetail from "./components/shifts/ShiftDetail.jsx";
import MainLayout from "./components/layout/MainLayout.jsx";
import NewShiftForm from "./components/shifts/form/NewShiftForm.jsx";
import ShiftControl from "./components/ShiftControl.jsx";
import ShiftList from "./components/shifts/PlannedShiftsList.jsx";
import Dashboard from "./components/shifts/dashboard/Dashboard.jsx";

function App() {

    return (
        <>
            <ShiftProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage/>}/>
                        <Route path="/" element={<Dashboard/>}/>
                        <Route element={<ProtectedRoute><MainLayout/></ProtectedRoute>}>
                            <Route path="shifts" element={<ShiftList/>}/>
                            <Route path="shifts/new" element={<NewShiftForm/>}/>
                            <Route path="shifts/control" element={<ShiftControl/>}/>
                            <Route path="shifts/:id" element={<ShiftDetail/>}/>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ShiftProvider>
        </>
    )
}

export default App
