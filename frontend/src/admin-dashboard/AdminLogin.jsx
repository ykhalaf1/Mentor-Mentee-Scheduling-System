import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import LoginStyle from "./LoginStyle";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "adminUsers", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "adminUsers", user.uid), {
          firstName,
          lastName,
          email,
          role: "admin",
        });
      } else if (userDoc.data().role !== "admin") {
        setError("Access denied: Not an admin.");
        return;
      }

      onLogin();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "100px",
        background: "#f0f2f5",
      }}
    >
      <div style={LoginStyle.base}>
        <img
          alt="logo"
          src={""}
          width="200px"
          style={{
            display: "block",
            margin: "80px auto 20px",
            cursor: "pointer",
          }}
        />

        <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
          Admin Login
        </h2>

        {error && (
          <p
            style={{ color: "red", marginBottom: "15px", textAlign: "center" }}
          >
            {error}
          </p>
        )}

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={{
              ...LoginStyle.emailBarLayout,
              ...LoginStyle.emailBarStyle,
              marginBottom: "15px",
              color: "#007CA6",
              fontFamily: "Poppins, sans-serif",
              textAlign: "center",
            }}
          />

          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={{
              ...LoginStyle.emailBarLayout,
              ...LoginStyle.emailBarStyle,
              marginBottom: "15px",
              color: "#007CA6",
              fontFamily: "Poppins, sans-serif",
              textAlign: "center",
            }}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              ...LoginStyle.emailBarLayout,
              ...LoginStyle.emailBarStyle,
              marginBottom: "15px",
              ...LoginStyle.emailTextLayer,
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              ...LoginStyle.passwordBarLayout,
              ...LoginStyle.passwordBarStyle,
              marginBottom: "15px",
              ...LoginStyle.passwordTextLayer,
            }}
          />

          <button
            type="submit"
            style={{
              ...LoginStyle.loginButtonLayout,
              ...LoginStyle.loginButtonStyle,
              ...LoginStyle.loginButtonTextLayer,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
