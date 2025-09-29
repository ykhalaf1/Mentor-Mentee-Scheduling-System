// Ryan's form app.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import MenteeForm from "./MenteeForm.js";
import "./App.css";

function Home() {
  const navigate = useNavigate();
  return (
    <div className="container">
      <h1 className="main-title">What do you want to be?</h1>
      <div className="button-group">
        <button className="btn" onClick={() => navigate("mentee-form")}>
          Mentee
        </button>
      </div>
    </div>
  );
}

function MenteeView() {
  return (
    <div>
      {/* Top Header Bar */}
      <div
        style={{
          height: "90px",
          background: "#E7E8EE",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 100,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          "@media (max-width: 1024px)": {
            height: "90px",
            padding: "0 32px",
          },
          "@media (max-width: 768px)": {
            height: "90px",
            padding: "0 24px",
          },
          "@media (max-width: 480px)": {
            height: "90px",
            padding: "0 16px",
          },
        }}
      >
        {/* Left side - Logo only */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/ummahprofLogo.png"
            alt="Logo"
            style={{
              width: "300px",
              height: "300px",
              objectFit: "contain",
              "@media (max-width: 1024px)": {
                width: "300px",
                height: "300px",
              },
              "@media (max-width: 768px)": {
                width: "200px",
                height: "200px",
              },
              "@media (max-width: 480px)": {
                width: "150px",
                height: "150px",
              },
            }}
          />
        </div>

        {/* Center - Navigation */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            justifyContent: "flex-end",
            flex: 1,
            marginRight: "40px",
            "@media (max-width: 1024px)": {
              gap: "32px",
              marginRight: "30px",
            },
            "@media (max-width: 768px)": {
              gap: "24px",
              marginRight: "20px",
            },
            "@media (max-width: 480px)": {
              gap: "16px",
              marginRight: "15px",
            },
          }}
        >
          <a
            href="#"
            style={{
              color: "#000000",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: "400",
              "@media (max-width: 1024px)": {
                fontSize: "1rem",
              },
              "@media (max-width: 768px)": {
                fontSize: "0.9rem",
              },
              "@media (max-width: 480px)": {
                fontSize: "0.8rem",
              },
            }}
          >
            home
          </a>
          <a
            href="#"
            style={{
              color: "#000000",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: "400",
              "@media (max-width: 1024px)": {
                fontSize: "1rem",
              },
              "@media (max-width: 768px)": {
                fontSize: "0.9rem",
              },
              "@media (max-width: 480px)": {
                fontSize: "0.8rem",
              },
            }}
          >
            about
          </a>
          <a
            href="#"
            style={{
              color: "#000000",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: "400",
              "@media (max-width: 1024px)": {
                fontSize: "1rem",
              },
              "@media (max-width: 768px)": {
                fontSize: "0.9rem",
              },
              "@media (max-width: 480px)": {
                fontSize: "0.8rem",
              },
            }}
          >
            get involved ▼
          </a>
          <a
            href="#"
            style={{
              color: "#000000",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: "400",
              "@media (max-width: 1024px)": {
                fontSize: "1rem",
              },
              "@media (max-width: 768px)": {
                fontSize: "0.9rem",
              },
              "@media (max-width: 480px)": {
                fontSize: "0.8rem",
              },
            }}
          >
            events
          </a>
          <a
            href="#"
            style={{
              color: "#000000",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: "400",
              "@media (max-width: 1024px)": {
                fontSize: "1rem",
              },
              "@media (max-width: 768px)": {
                fontSize: "0.9rem",
              },
              "@media (max-width: 480px)": {
                fontSize: "0.8rem",
              },
            }}
          >
            contact us
          </a>
        </div>

        {/* Right side - Donate Button */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            style={{
              background: "#FDBB37",
              color: "#ffffff",
              border: "none",
              padding: "16px 32px",
              borderRadius: "6px",
              fontSize: "1.1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background 0.2s",
              "@media (max-width: 1024px)": {
                padding: "14px 28px",
                fontSize: "1rem",
              },
              "@media (max-width: 768px)": {
                padding: "12px 24px",
                fontSize: "0.9rem",
              },
              "@media (max-width: 480px)": {
                padding: "10px 20px",
                fontSize: "0.8rem",
              },
            }}
            onMouseOver={(e) => (e.target.style.background = "#e6a800")}
            onMouseOut={(e) => (e.target.style.background = "#FDBB37")}
          >
            donate
          </button>
        </div>
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mentee-form" element={<MenteeForm />} />
      </Routes>
    </div>
  );
}

export default MenteeView;
