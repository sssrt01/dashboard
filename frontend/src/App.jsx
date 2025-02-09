import ShiftProvider from "./copmonents/ShiftProvider.jsx";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Dashboard from "./copmonents/Dashboard.jsx";
import AdminPage from "./copmonents/ShiftDisplay.jsx";
import LoginPage from "./copmonents/LoginPage.jsx";
import ProtectedRoute from "./copmonents/LoginProvider.jsx";
import 'antd/dist/reset.css';

function App() {

  return (
      <>
      <ShiftProvider>
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Dashboard/>} />
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
