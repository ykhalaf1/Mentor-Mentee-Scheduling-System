import MentorApplicationForm from "./mentor-application/MentorApplicationForm";
import { useEffect, useState } from "react";
import MentorLogin from "./mentor-login/MentorLogin";
import MentorCreateUser from "./mentor-create-account/MentorCreateUser";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import MentorDashboard from "./mentor-dashboard/MentorDashboard";
import { onAuthStateChanged } from "firebase/auth";
import LandingPage from "./mentor-langing-page/LandingPage";
import MenteeView from "./mentee-application/MenteeView";
import react from "react";
import MenteeDashboard from "./mentee-dashboard/MenteeDashboard";
import AdminView from "./admin-dashboard/AdminView";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/mentee-view/*" element={<MenteeView />} />
        <Route path="/mentee-dashboard" element={<MenteeDashboard />} />
        <Route path="/mentor-application" element={<MentorApplicationForm />} />
        <Route path="/mentor-login" element={<MentorLogin />} />
        <Route path="/create-password" element={<MentorCreateUser />} />
        <Route path="/mentor-dashboard" element={<MentorDashboard />} />
        <Route path="/admin-dashboard/*" element={<AdminView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
