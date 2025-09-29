import React, { useEffect, useState } from "react";
import { doCreateUserWithEmailAndPassword } from "../Auth";
import { db } from "../firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import GoogleOAuth from "../mentee-application/GoogleOAuth";

export default function MentorCreateUser() {
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get("email") || "";
  const dbIdFromUrl = urlParams.get("dbId") || "";
  const email = emailFromUrl;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [mentorData, setMentorData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMentorData = async () => {
      if (!dbIdFromUrl) {
        return;
      }
      const docRef = doc(db, "pendingMentors", dbIdFromUrl);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMentorData(docSnap.data());
        console.log("Document data:", docSnap.data());
      } else {
        console.log("No such document!");
      }
    };
    fetchMentorData();
  }, [dbIdFromUrl]);
  async function handleSubmit(e) {
    // previous code
    let uid;
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      await doCreateUserWithEmailAndPassword(email, password).then(
        (userCredential) => {
          const user = userCredential.user;
          uid = user.uid;
        }
      );
      await setDoc(doc(db, "mentors", uid), mentorData);
      await deleteDoc(doc(db, "pendingMentors", dbIdFromUrl));

      alert("Welcome to the team");
      navigate("/mentor-dashboard");
    } catch (error) {
      console.error("Error creating user:", error);
      setError("Failed to create an account");
      if (error.code === "auth/email-already-in-use") {
        alert("Email already in use");
      }
    }
  }

  return (
    <div className="form-container">
      <div className="form-content">
        <h1 className="form-title">Mentor Sign Up</h1>
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="example@gmail.com"
              autoComplete="email"
              value={emailFromUrl}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password:
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Confirm Password:
            </label>
            <input
              type="password"
              id="confirm-password"
              name="confirm-password"
              className="form-input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* Google Calendar OAuth Integration */}
          {/* <div style={{ marginTop: 24, marginBottom: 24 }}>
            <label>
              Google Calendar Access <span style={{ color: "red" }}>*</span>
            </label>
            <p style={{ fontSize: "0.95rem", color: "#666", marginBottom: 16 }}>
              We need access to your Google Calendar to automatically add
              mentoring sessions when meetings are confirmed. This ensures you
              never miss a session.
            </p>
            <GoogleOAuth
              userId={email} // Use email as the identifier for OAuth
              userEmail={email}
              onAuthSuccess={(userId) => {
                console.log("Mentee calendar access granted for user:", userId);
                setMentorData((prev) => ({ ...prev, hasCalendarAccess: true }));
              }}
              onAuthError={(error) => {
                console.log("Mentee calendar access failed:", error);
                setMentorData((prev) => ({
                  ...prev,
                  hasCalendarAccess: false,
                }));
              }}
            />
          </div> */}

          <button type="submit" className="submit-btn">
            Sign Up
          </button>
        </form>
        <p className="form-text">
          Already have an account?
          {/* <Link to="/mentor-signin">Sign In</Link> */}
        </p>
      </div>
    </div>
  );
}
