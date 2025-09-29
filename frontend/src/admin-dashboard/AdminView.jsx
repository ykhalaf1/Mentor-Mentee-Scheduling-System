import { ColorModeContext, useMode } from "./theme";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import AdminLogin from "./AdminLogin";
import Topbar from "./AdminTopbar";
import Dashboard from "./AdminDashboard";
import AdminSidebar from "./AdminSidebar";
import Mentees from "./MenteeList";
import Mentors from "./MentorList";
import Charts from "./Charts";
import Calendar from "./AdminCalendar";
import "./AdminView.css";

function AdminView() {
  const [theme, colorMode] = useMode();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <Routes>
          {!isAdminLoggedIn ? (
            // Show login page if not logged in
            <Route
              path="/*"
              element={<AdminLogin onLogin={() => setIsAdminLoggedIn(true)} />}
            />
          ) : (
            // Show dashboard and all routes if logged in
            <>
              <Route
                path="/"
                element={
                  <div className="admin-view">
                    <AdminSidebar />
                    <main className="admin-content">
                      <Topbar />
                      <Dashboard />
                    </main>
                  </div>
                }
              />
              <Route
                path="/mentors"
                element={
                  <div className="admin-view">
                    <AdminSidebar />
                    <main className="admin-content">
                      <Topbar />
                      <Mentors />
                    </main>
                  </div>
                }
              />
              <Route
                path="/mentees"
                element={
                  <div className="admin-view">
                    <AdminSidebar />
                    <main className="admin-content">
                      <Topbar />
                      <Mentees />
                    </main>
                  </div>
                }
              />
              <Route
                path="/charts"
                element={
                  <div className="admin-view">
                    <AdminSidebar />
                    <main className="admin-content">
                      <Topbar />
                      <Charts />
                    </main>
                  </div>
                }
              />
              <Route
                path="/calendar"
                element={
                  <div className="admin-view">
                    <AdminSidebar />
                    <main className="admin-content">
                      <Topbar />
                      <Calendar />
                    </main>
                  </div>
                }
              />
            </>
          )}
        </Routes>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default AdminView;
