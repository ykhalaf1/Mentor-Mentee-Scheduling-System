import React from "react";
import "./landingPage.css";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-page">
      <nav class="navbar">
        <img class="navy" src="../navy.png" alt="logo" />
        <ul>
          <li>
            <a href="https://www.ummahprofessionals.com/">home</a>
          </li>
          <li>
            <a href="https://www.ummahprofessionals.com/about">about</a>
          </li>
          <li>
            <a href="https://www.ummahprofessionals.com/students">
              get involved
            </a>
          </li>
          <li>
            <a href="https://www.ummahprofessionals.com/events">events</a>
          </li>
          <li>
            <a href="https://www.ummahprofessionals.com/contact">contact us</a>
          </li>
          <li class="donate">
            <a href="https://www.ummahprofessionals.com/donate">donate</a>
          </li>
        </ul>
      </nav>
      <h1 class="title">
        <strong>mentor platform</strong>
      </h1>
      <p class="subtitle">
        Give personalized career advice to Muslim <br /> students and be the
        change to get them their first job.
      </p>
      <button class="student" onClick={() => navigate("/mentor-application")}>
        give career advice
      </button>
      <p class="login" onClick={() => navigate("/mentor-login")}>
        <i>
          already have an account? <a href="">login here</a>
        </i>
      </p>
    </div>
  );
};

export default LandingPage;
