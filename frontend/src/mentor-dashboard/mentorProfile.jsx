import React, { useEffect, useState } from "react";
import "./index.css";
import { auth } from "../firebase";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import DisplayAvailabilityGrid from "./mentor-features/DisplayAvailabilityGrid";

// Cant update anything yet

function MentorProfile() {
  const user = auth.currentUser;
  const userId = user.uid;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId) => {
    const docRef = doc(db, "mentors", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      setProfile(docSnap.data());
    } else {
      console.log("No data was found");
    }
  };

  useEffect(() => {
    fetchUserProfile(userId);
  }, [userId]);

  return (
    <div className="profile-header">
      <div className="profile-section">
        <div className="avatar"></div>
        <div className="profile-info">
          <h1>
            {profile ? profile.name : "Profile Loading ..."}
            <span className="advisor-badge">Mentor</span>
          </h1>
          <p className="mentor-dashboard-subtitle">Open to help in:</p>
          <div className="help-tags">
            {profile &&
              profile.helpIn.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
          </div>
        </div>
        <button className="edit-btn header-edit">
          Edit Profile <> </>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z"></path>
          </svg>
        </button>
      </div>

      {/* Information Section */}
      <div className="section">
        <h2>
          Information <span className="asterisk">*</span>
        </h2>
        <div className="info-card">
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">{user.email}</span>
          </div>
          <div className="info-row">
            <span className="label">Phone: </span>
            <span className="value">
              {profile ? profile.phone : "Not found"}
            </span>
          </div>
        </div>
      </div>

      {/* Experience Section */}
      <div className="section">
        <h2>Experience</h2>
        <div className="experience-card">
          <div className="experience-row">
            <div className="experience-item">
              <span className="label">Employers:</span>
              <span className="value">
                {profile ? profile.companies : "Not found"}
                <span className="asterisk">*</span>
              </span>
            </div>
            <div className="experience-item">
              <span className="label">Years of Experience:</span>
              <span className="value">
                {profile ? profile.yearsOfExperience : "Not found"}
              </span>
            </div>
            <div className="experience-item">
              <span className="label">Industry:</span>
              <span className="value">
                {profile ? profile.industry : "Not found"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Education Section */}
      <div className="section">
        <h2>Education</h2>
        <div className="education-card">
          <div className="education-row">
            <div className="education-item">
              <span className="label">Alma Mater:</span>
              <span className="value">
                {profile ? profile.university : "Not found"}
              </span>
            </div>
            <div className="education-item">
              <span className="label">Major:</span>
              <span className="value">
                {profile ? profile.major : "Not found"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="section">
        <h2>Skills</h2>``
        <div className="skills-card">
          <div className="skills-list">
            {profile &&
            profile.skills &&
            Array.isArray(profile.skills) &&
            profile.skills.length > 0
              ? profile.skills.map((skill) => (
                  <span className="skill-tag">{skill.trim()}</span>
                ))
              : "Not found"}
          </div>
        </div>
      </div>

      <div className="section">
        <h2>General Availability</h2>
        <div className="availability-card">
          {profile &&
          profile.availability &&
          profile.availability.length > 0 ? (
            <DisplayAvailabilityGrid availabilityArray={profile.availability} />
          ) : (
            "Not found"
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="footer-note">
        <span className="asterisk">*</span>
        Not visible to students
      </div>
    </div>
  );
}

export default MentorProfile;
