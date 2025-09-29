import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Select from "react-select";
import AvailabilityForm from "./AvailabilityForm";

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/?d=mp&f=y";

const industryOptions = [
  { value: "Business", label: "Business" },
  { value: "Education", label: "Education" },
  { value: "Engineering", label: "Engineering" },
  { value: "Finance", label: "Finance" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Information Technology", label: "Information Technology" },
  { value: "Law", label: "Law" },
  { value: "Social Services", label: "Social Services" },
  { value: "Science", label: "Science" },
  { value: "Arts", label: "Arts" },
  { value: "Other", label: "Other" },
];

const majorOptions = [
  { value: "Accounting", label: "Accounting" },
  { value: "Actuarial Science", label: "Actuarial Science" },
  { value: "Advertising Major", label: "Advertising Major" },
  { value: "Aerospace Engineering", label: "Aerospace Engineering" },
  {
    value: "African Languages, Literatures, and Linguistics",
    label: "African Languages, Literatures, and Linguistics",
  },
  { value: "African Studies", label: "African Studies" },
  { value: "African-American Studies", label: "African-American Studies" },
  {
    value: "Agricultural Business and Management",
    label: "Agricultural Business and Management",
  },
  { value: "Agricultural Economics", label: "Agricultural Economics" },
  { value: "Agricultural Education", label: "Agricultural Education" },
  { value: "Agricultural Journalism", label: "Agricultural Journalism" },
  {
    value: "Agricultural Mechanization Major",
    label: "Agricultural Mechanization Major",
  },
  {
    value: "Agricultural Technology Management",
    label: "Agricultural Technology Management",
  },
  {
    value: "Agricultural/Biological Engineering and Bioengineering",
    label: "Agricultural/Biological Engineering and Bioengineering",
  },
  { value: "Agriculture", label: "Agriculture" },
  { value: "Agronomy and Crop Science", label: "Agronomy and Crop Science" },
  { value: "Air Traffic Control", label: "Air Traffic Control" },
  { value: "American History", label: "American History" },
  { value: "American Literature", label: "American Literature" },
  { value: "American Sign Language", label: "American Sign Language" },
  { value: "American Studies", label: "American Studies" },
  { value: "Anatomy", label: "Anatomy" },
  { value: "Ancient Studies", label: "Ancient Studies" },
  {
    value: "Animal Behavior and Ethology",
    label: "Animal Behavior and Ethology",
  },
  { value: "Animal Science", label: "Animal Science" },
  {
    value: "Animation and Special Effects",
    label: "Animation and Special Effects",
  },
  { value: "Anthropology", label: "Anthropology" },
  { value: "Applied Mathematics", label: "Applied Mathematics" },
  { value: "Aquaculture", label: "Aquaculture" },
  { value: "Aquatic Biology", label: "Aquatic Biology" },
  { value: "Arabic", label: "Arabic" },
  { value: "Archeology", label: "Archeology" },
  { value: "Architectural Engineering", label: "Architectural Engineering" },
  { value: "Architectural History", label: "Architectural History" },
  { value: "Architecture", label: "Architecture" },
  { value: "Art", label: "Art" },
  { value: "Art Education", label: "Art Education" },
  { value: "Art History", label: "Art History" },
  { value: "Art Therapy", label: "Art Therapy" },
  {
    value: "Artificial Intelligence and Robotics",
    label: "Artificial Intelligence and Robotics",
  },
  { value: "Asian-American Studies", label: "Asian-American Studies" },
  { value: "Astronomy", label: "Astronomy" },
  { value: "Astrophysics", label: "Astrophysics" },
  { value: "Athletic Training", label: "Athletic Training" },
  { value: "Atmospheric Science", label: "Atmospheric Science" },
  { value: "Automotive Engineering", label: "Automotive Engineering" },
  { value: "Aviation", label: "Aviation" },
  { value: "Bakery Science", label: "Bakery Science" },
  { value: "Biblical Studies", label: "Biblical Studies" },
  { value: "Biochemistry", label: "Biochemistry" },
  { value: "Bioethics", label: "Bioethics" },
  { value: "Biology", label: "Biology" },
  { value: "Biomedical Engineering", label: "Biomedical Engineering" },
  { value: "Biomedical Science", label: "Biomedical Science" },
  { value: "Biopsychology", label: "Biopsychology" },
  { value: "Biotechnology", label: "Biotechnology" },
  { value: "Botany/Plant Biology", label: "Botany/Plant Biology" },
  {
    value: "Business Administration/Management",
    label: "Business Administration/Management",
  },
  { value: "Business Communications", label: "Business Communications" },
  { value: "Business Education", label: "Business Education" },
  { value: "Canadian Studies", label: "Canadian Studies" },
  { value: "Caribbean Studies", label: "Caribbean Studies" },
  { value: "Cell Biology Major", label: "Cell Biology Major" },
  { value: "Ceramic Engineering", label: "Ceramic Engineering" },
  { value: "Ceramics", label: "Ceramics" },
  { value: "Chemical Engineering Major", label: "Chemical Engineering Major" },
  { value: "Chemical Physics", label: "Chemical Physics" },
  { value: "Chemistry Major", label: "Chemistry Major" },
  { value: "Child Care", label: "Child Care" },
  { value: "Child Development", label: "Child Development" },
  { value: "Chinese", label: "Chinese" },
  { value: "Chiropractic", label: "Chiropractic" },
  { value: "Church Music", label: "Church Music" },
  {
    value: "Cinematography and Film/Video Production",
    label: "Cinematography and Film/Video Production",
  },
  { value: "Circulation Technology", label: "Circulation Technology" },
  { value: "Civil Engineering", label: "Civil Engineering" },
  { value: "Classics", label: "Classics" },
  { value: "Clinical Psychology", label: "Clinical Psychology" },
  { value: "Cognitive Psychology", label: "Cognitive Psychology" },
  { value: "Communication Disorders", label: "Communication Disorders" },
  {
    value: "Communications Studies/Speech Communication and Rhetoric",
    label: "Communications Studies/Speech Communication and Rhetoric",
  },
  { value: "Comparative Literature", label: "Comparative Literature" },
  {
    value: "Computer and Information Science",
    label: "Computer and Information Science",
  },
  { value: "Computer Engineering", label: "Computer Engineering" },
  { value: "Computer Graphics", label: "Computer Graphics" },
  {
    value: "Computer Systems Analysis Major",
    label: "Computer Systems Analysis Major",
  },
  { value: "Construction Management", label: "Construction Management" },
  { value: "Counseling", label: "Counseling" },
  { value: "Crafts", label: "Crafts" },
  { value: "Creative Writing", label: "Creative Writing" },
  { value: "Criminal Science", label: "Criminal Science" },
  { value: "Criminology", label: "Criminology" },
  { value: "Culinary Arts", label: "Culinary Arts" },
  { value: "Dance", label: "Dance" },
  { value: "Data Processing", label: "Data Processing" },
  { value: "Dental Hygiene", label: "Dental Hygiene" },
  { value: "Developmental Psychology", label: "Developmental Psychology" },
  {
    value: "Diagnostic Medical Sonography",
    label: "Diagnostic Medical Sonography",
  },
  { value: "Dietetics", label: "Dietetics" },
  {
    value: "Digital Communications and Media/Multimedia",
    label: "Digital Communications and Media/Multimedia",
  },
  { value: "Drawing", label: "Drawing" },
  { value: "Early Childhood Education", label: "Early Childhood Education" },
  { value: "East Asian Studies", label: "East Asian Studies" },
  { value: "East European Studies", label: "East European Studies" },
  { value: "Ecology", label: "Ecology" },
  { value: "Economics Major", label: "Economics Major" },
  { value: "Education", label: "Education" },
  { value: "Education Administration", label: "Education Administration" },
  { value: "Education of the Deaf", label: "Education of the Deaf" },
  { value: "Educational Psychology", label: "Educational Psychology" },
  { value: "Electrical Engineering", label: "Electrical Engineering" },
  { value: "Elementary Education", label: "Elementary Education" },
  { value: "Engineering Mechanics", label: "Engineering Mechanics" },
  { value: "Engineering Physics", label: "Engineering Physics" },
  { value: "English", label: "English" },
  { value: "English Composition", label: "English Composition" },
  { value: "English Literature Major", label: "English Literature Major" },
  { value: "Entomology", label: "Entomology" },
  { value: "Entrepreneurship Major", label: "Entrepreneurship Major" },
  {
    value: "Environmental Design/Architecture",
    label: "Environmental Design/Architecture",
  },
  { value: "Environmental Science", label: "Environmental Science" },
  {
    value: "Environmental/Environmental Health Engineering",
    label: "Environmental/Environmental Health Engineering",
  },
  { value: "Epidemiology", label: "Epidemiology" },
  { value: "Equine Studies", label: "Equine Studies" },
  { value: "Ethnic Studies", label: "Ethnic Studies" },
  { value: "European History", label: "European History" },
  { value: "Experimental Pathology", label: "Experimental Pathology" },
  { value: "Experimental Psychology", label: "Experimental Psychology" },
  { value: "Fashion Design", label: "Fashion Design" },
  { value: "Fashion Merchandising", label: "Fashion Merchandising" },
  { value: "Feed Science", label: "Feed Science" },
  {
    value: "Fiber, Textiles, and Weaving Arts",
    label: "Fiber, Textiles, and Weaving Arts",
  },
  { value: "Film", label: "Film" },
  { value: "Finance", label: "Finance" },
  { value: "Floriculture", label: "Floriculture" },
  { value: "Food Science", label: "Food Science" },
  { value: "Forensic Science", label: "Forensic Science" },
  { value: "Forestry", label: "Forestry" },
  { value: "French", label: "French" },
  { value: "Furniture Design", label: "Furniture Design" },
  { value: "Game Design", label: "Game Design" },
  { value: "Gay and Lesbian Studies", label: "Gay and Lesbian Studies" },
  { value: "Genetics", label: "Genetics" },
  { value: "Geography", label: "Geography" },
  { value: "Geological Engineering", label: "Geological Engineering" },
  { value: "Geology", label: "Geology" },
  { value: "Geophysics", label: "Geophysics" },
  { value: "German", label: "German" },
  { value: "Gerontology", label: "Gerontology" },
  { value: "Government Major", label: "Government Major" },
  { value: "Graphic Design", label: "Graphic Design" },
  { value: "Health Administration", label: "Health Administration" },
  { value: "Hebrew", label: "Hebrew" },
  {
    value: "Hispanic-American, Puerto Rican, and Chicano Studies",
    label: "Hispanic-American, Puerto Rican, and Chicano Studies",
  },
  { value: "Historic Preservation", label: "Historic Preservation" },
  { value: "History", label: "History" },
  { value: "Home Economics", label: "Home Economics" },
  { value: "Horticulture", label: "Horticulture" },
  { value: "Hospitality", label: "Hospitality" },
  { value: "Human Development", label: "Human Development" },
  {
    value: "Human Resources Management Major",
    label: "Human Resources Management Major",
  },
  { value: "Illustration", label: "Illustration" },
  { value: "Industrial Design", label: "Industrial Design" },
  { value: "Industrial Engineering", label: "Industrial Engineering" },
  { value: "Industrial Management", label: "Industrial Management" },
  { value: "Industrial Psychology", label: "Industrial Psychology" },
  { value: "Information Technology", label: "Information Technology" },
  { value: "Interior Architecture", label: "Interior Architecture" },
  { value: "Interior Design", label: "Interior Design" },
  { value: "International Agriculture", label: "International Agriculture" },
  { value: "International Business", label: "International Business" },
  { value: "International Relations", label: "International Relations" },
  { value: "International Studies", label: "International Studies" },
  { value: "Islamic Studies", label: "Islamic Studies" },
  { value: "Italian", label: "Italian" },
  { value: "Japanese", label: "Japanese" },
  { value: "Jazz Studies", label: "Jazz Studies" },
  { value: "Jewelry and Metalsmithing", label: "Jewelry and Metalsmithing" },
  { value: "Jewish Studies", label: "Jewish Studies" },
  { value: "Journalism", label: "Journalism" },
  { value: "Kinesiology", label: "Kinesiology" },
  { value: "Korean", label: "Korean" },
  {
    value: "Land Use Planning and Management",
    label: "Land Use Planning and Management",
  },
  { value: "Landscape Architecture", label: "Landscape Architecture" },
  { value: "Landscape Horticulture", label: "Landscape Horticulture" },
  { value: "Latin American Studies", label: "Latin American Studies" },
  { value: "Library Science", label: "Library Science" },
  { value: "Linguistics", label: "Linguistics" },
  { value: "Logistics Management", label: "Logistics Management" },
  {
    value: "Management Information Systems",
    label: "Management Information Systems",
  },
  { value: "Managerial Economics", label: "Managerial Economics" },
  { value: "Marine Biology Major", label: "Marine Biology Major" },
  { value: "Marine Science", label: "Marine Science" },
  { value: "Marketing Major", label: "Marketing Major" },
  { value: "Mass Communication", label: "Mass Communication" },
  { value: "Massage Therapy", label: "Massage Therapy" },
  { value: "Materials Science", label: "Materials Science" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "Mechanical Engineering", label: "Mechanical Engineering" },
  { value: "Medical Technology", label: "Medical Technology" },
  {
    value: "Medieval and Renaissance Studies",
    label: "Medieval and Renaissance Studies",
  },
  { value: "Mental Health Services", label: "Mental Health Services" },
  {
    value: "Merchandising and Buying Operations",
    label: "Merchandising and Buying Operations",
  },
  { value: "Metallurgical Engineering", label: "Metallurgical Engineering" },
  { value: "Microbiology", label: "Microbiology" },
  { value: "Middle Eastern Studies", label: "Middle Eastern Studies" },
  { value: "Military Science", label: "Military Science" },
  { value: "Mineral Engineering", label: "Mineral Engineering" },
  { value: "Missions", label: "Missions" },
  { value: "Modern Greek", label: "Modern Greek" },
  { value: "Molecular Biology", label: "Molecular Biology" },
  { value: "Molecular Genetics", label: "Molecular Genetics" },
  { value: "Mortuary Science", label: "Mortuary Science" },
  { value: "Museum Studies", label: "Museum Studies" },
  { value: "Music", label: "Music" },
  { value: "Music Education", label: "Music Education" },
  { value: "Music History Major", label: "Music History Major" },
  { value: "Music Management", label: "Music Management" },
  { value: "Music Therapy", label: "Music Therapy" },
  { value: "Musical Theater", label: "Musical Theater" },
  { value: "Native American Studies", label: "Native American Studies" },
  {
    value: "Natural Resources Conservation",
    label: "Natural Resources Conservation",
  },
  { value: "Naval Architecture", label: "Naval Architecture" },
  { value: "Neurobiology", label: "Neurobiology" },
  { value: "Neuroscience", label: "Neuroscience" },
  { value: "Nuclear Engineering", label: "Nuclear Engineering" },
  { value: "Nursing Major", label: "Nursing Major" },
  { value: "Nutrition", label: "Nutrition" },
  { value: "Occupational Therapy", label: "Occupational Therapy" },
  { value: "Ocean Engineering", label: "Ocean Engineering" },
  { value: "Oceanography", label: "Oceanography" },
  { value: "Operations Management", label: "Operations Management" },
  {
    value: "Organizational Behavior Studies",
    label: "Organizational Behavior Studies",
  },
  { value: "Painting", label: "Painting" },
  { value: "Paleontology", label: "Paleontology" },
  { value: "Pastoral Studies", label: "Pastoral Studies" },
  { value: "Peace Studies", label: "Peace Studies" },
  { value: "Petroleum Engineering", label: "Petroleum Engineering" },
  { value: "Pharmacology", label: "Pharmacology" },
  { value: "Pharmacy", label: "Pharmacy" },
  { value: "Philosophy", label: "Philosophy" },
  { value: "Photography", label: "Photography" },
  { value: "Photojournalism Major", label: "Photojournalism Major" },
  { value: "Physical Education", label: "Physical Education" },
  { value: "Physical Therapy", label: "Physical Therapy" },
  { value: "Physician Assistant", label: "Physician Assistant" },
  { value: "Physics", label: "Physics" },
  { value: "Physiological Psychology", label: "Physiological Psychology" },
  { value: "Piano", label: "Piano" },
  { value: "Planetary Science", label: "Planetary Science" },
  { value: "Plant Pathology", label: "Plant Pathology" },
  {
    value: "Playwriting and Screenwriting",
    label: "Playwriting and Screenwriting",
  },
  { value: "Political Communication", label: "Political Communication" },
  { value: "Political Science Major", label: "Political Science Major" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Pre-Dentistry", label: "Pre-Dentistry" },
  { value: "Pre-Law", label: "Pre-Law" },
  { value: "Pre-Medicine", label: "Pre-Medicine" },
  { value: "Pre-Optometry", label: "Pre-Optometry" },
  { value: "Pre-Seminary", label: "Pre-Seminary" },
  { value: "Pre-Veterinary Medicine", label: "Pre-Veterinary Medicine" },
  { value: "Printmaking", label: "Printmaking" },
  { value: "Psychology", label: "Psychology" },
  { value: "Public Administration", label: "Public Administration" },
  { value: "Public Health", label: "Public Health" },
  { value: "Public Policy Analysis", label: "Public Policy Analysis" },
  { value: "Public Relations Major", label: "Public Relations Major" },
  { value: "Radio and Television", label: "Radio and Television" },
  { value: "Radiologic Technology", label: "Radiologic Technology" },
  {
    value: "Range Science and Management",
    label: "Range Science and Management",
  },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Recording Arts Technology", label: "Recording Arts Technology" },
  { value: "Recreation Management", label: "Recreation Management" },
  { value: "Rehabilitation Services", label: "Rehabilitation Services" },
  { value: "Religious Studies", label: "Religious Studies" },
  { value: "Respiratory Therapy", label: "Respiratory Therapy" },
  { value: "Risk Management", label: "Risk Management" },
  { value: "Rural Sociology", label: "Rural Sociology" },
  { value: "Russian", label: "Russian" },
  { value: "Scandinavian Studies", label: "Scandinavian Studies" },
  { value: "Sculpture", label: "Sculpture" },
  {
    value: "Slavic Languages and Literatures",
    label: "Slavic Languages and Literatures",
  },
  { value: "Social Psychology", label: "Social Psychology" },
  { value: "Social Work", label: "Social Work" },
  { value: "Sociology", label: "Sociology" },
  { value: "Soil Science", label: "Soil Science" },
  { value: "Sound Engineering", label: "Sound Engineering" },
  { value: "South Asian Studies", label: "South Asian Studies" },
  { value: "Southeast Asia Studies", label: "Southeast Asia Studies" },
  { value: "Spanish Major", label: "Spanish Major" },
  { value: "Special Education", label: "Special Education" },
  { value: "Speech Pathology", label: "Speech Pathology" },
  { value: "Sport and Leisure Studies", label: "Sport and Leisure Studies" },
  { value: "Sports Management", label: "Sports Management" },
  { value: "Statistics Major", label: "Statistics Major" },
  { value: "Surveying", label: "Surveying" },
  {
    value: "Sustainable Resource Management",
    label: "Sustainable Resource Management",
  },
  { value: "Teacher Education", label: "Teacher Education" },
  {
    value: "Teaching English as a Second Language",
    label: "Teaching English as a Second Language",
  },
  { value: "Technical Writing", label: "Technical Writing" },
  { value: "Technology Education", label: "Technology Education" },
  { value: "Textile Engineering", label: "Textile Engineering" },
  { value: "Theatre", label: "Theatre" },
  { value: "Theology", label: "Theology" },
  { value: "Tourism", label: "Tourism" },
  { value: "Toxicology", label: "Toxicology" },
  { value: "Turfgrass Science", label: "Turfgrass Science" },
  { value: "Urban Planning", label: "Urban Planning" },
  { value: "Urban Studies", label: "Urban Studies" },
  { value: "Visual Communication", label: "Visual Communication" },
  { value: "Voice", label: "Voice" },
  { value: "Web Design", label: "Web Design" },
  {
    value: "Webmaster and Web Management",
    label: "Webmaster and Web Management",
  },
  { value: "Welding Engineering", label: "Welding Engineering" },
  { value: "Wildlife Management", label: "Wildlife Management" },
  { value: "Women's Studies", label: "Women's Studies" },
  { value: "Youth Ministries", label: "Youth Ministries" },
  { value: "Zoology", label: "Zoology" },
  { value: "Other", label: "Other" },
];

const gradeOptions = [
  { value: "High School", label: "High School" },
  { value: "Freshman", label: "Freshman" },
  { value: "Sophomore", label: "Sophomore" },
  { value: "Junior", label: "Junior" },
  { value: "Senior", label: "Senior" },
  { value: "Graduate Student", label: "Graduate Student" },
  { value: "Graduated", label: "Graduated" },
];

const serviceOptions = [
  { value: "Career advice", label: "Career advice" },
  { value: "Resume review", label: "Resume review" },
  { value: "Interview prep", label: "Interview prep" },
  { value: "Networking", label: "Networking" },
  { value: "Skill development", label: "Skill development" },
  { value: "Project guidance", label: "Project guidance" },
];

export default function ProfilePage({ onBack, user }) {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set());

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        setProfile({});
        return;
      }
      const docRef = doc(db, "mentees", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        // Convert availability to selected slots format
        if (data.generalAvailability) {
          const slots = new Set();
          Object.entries(data.generalAvailability).forEach(
            ([day, timeSlots]) => {
              if (Array.isArray(timeSlots)) {
                timeSlots.forEach((timeSlot) => {
                  // Convert "9am-10am" format to "9:00 AM" format
                  const timeMatch = timeSlot.match(/(\d+)(am|pm)/);
                  if (timeMatch) {
                    const hour = parseInt(timeMatch[1]);
                    const period = timeMatch[2].toUpperCase();
                    const timeString = `${hour}:00 ${period}`;
                    slots.add(`${day}-${timeString}`);
                  }
                });
              }
            }
          );
          setSelectedSlots(slots);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Communicate unsaved changes to parent component
  useEffect(() => {
    window.profileHasUnsavedChanges = dirty;
  }, [dirty]);

  const handleChange = (e) => {
    setDirty(true);
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleAvailabilityChange = (newSelectedSlots) => {
    setSelectedSlots(newSelectedSlots);
    setDirty(true);

    // Convert back to generalAvailability format (convert "9:00 AM" to "9am-10am")
    const availability = {};
    newSelectedSlots.forEach((slot) => {
      const [day, time] = slot.split("-");
      if (!availability[day]) {
        availability[day] = [];
      }

      // Convert "9:00 AM" format to "9am-10am" format
      const timeMatch = time.match(/(\d+):00 (AM|PM)/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const period = timeMatch[2].toLowerCase();
        const timeString = `${hour}${period}-${hour + 1}${period}`;
        availability[day].push(timeString);
      }
    });

    setProfile({ ...profile, generalAvailability: availability });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, "mentees", user.uid);
      await updateDoc(docRef, profile);
      setDirty(false);
      window.profileHasUnsavedChanges = false;
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const user = auth.currentUser;
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfile({ ...profile, profilePic: url });
      setDirty(true);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("Error uploading profile picture. Please try again.");
    }
  };

  const handleResumeChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const user = auth.currentUser;
      const storageRef = ref(storage, `resumes/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfile({ ...profile, resumeUrl: url });
      setDirty(true);
      alert("Resume uploaded successfully!");
    } catch (error) {
      console.error("Error uploading resume:", error);
      alert("Error uploading resume. Please try again.");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
          color: "#00212C",
          background: "#ffffff",
          minHeight: "100vh",
        }}
      >
        <div style={{ color: "#007CA6", fontSize: 24 }}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        color: "#00212C",
        background: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              color: "#007CA6",
              fontSize: 38,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            PROFILE
          </h1>
          <div style={{ color: "#007CA6", fontSize: 20, marginBottom: 16 }}>
            Manage your personal information
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {/* Left Column - Personal Info */}
          <div style={{ flex: "1", minWidth: 300 }}>
            {/* Personal Information */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                boxShadow: "0 4px 24px rgba(138,203,219,0.18)",
                border: "2px solid #8ACBDB",
                padding: 32,
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  color: "#007CA6",
                  fontWeight: 800,
                  fontSize: 24,
                  marginBottom: 24,
                }}
              >
                Personal Information
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 24,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    First Name
                  </label>
                  <input
                    value={profile.firstName || ""}
                    disabled
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                      background: "#f5f5f5",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Middle Name
                  </label>
                  <input
                    value={profile.middleName || ""}
                    disabled
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                      background: "#f5f5f5",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Last Name
                  </label>
                  <input
                    value={profile.lastName || ""}
                    disabled
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                      background: "#f5f5f5",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Email
                  </label>
                  <input
                    value={profile.email || ""}
                    disabled
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                      background: "#f5f5f5",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={profile.phone || ""}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Country
                  </label>
                  <input
                    name="country"
                    value={profile.country || ""}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                boxShadow: "0 4px 24px rgba(138,203,219,0.18)",
                border: "2px solid #8ACBDB",
                padding: 32,
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  color: "#007CA6",
                  fontWeight: 800,
                  fontSize: 24,
                  marginBottom: 24,
                }}
              >
                Academic Information
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 24,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    University
                  </label>
                  <input
                    name="university"
                    value={profile.university || ""}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Major
                  </label>
                  <Select
                    name="major"
                    options={majorOptions}
                    value={
                      majorOptions.find((opt) => opt.value === profile.major) ||
                      null
                    }
                    onChange={(selected) => {
                      setDirty(true);
                      setProfile({
                        ...profile,
                        major: selected ? selected.value : "",
                      });
                    }}
                    classNamePrefix="react-select"
                    placeholder="Select major..."
                    isClearable
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        fontSize: 16,
                        minHeight: "48px",
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Current Grade
                  </label>
                  <Select
                    name="currentGrade"
                    options={gradeOptions}
                    value={
                      gradeOptions.find(
                        (opt) => opt.value === profile.currentGrade
                      ) || null
                    }
                    onChange={(selected) => {
                      setDirty(true);
                      setProfile({
                        ...profile,
                        currentGrade: selected ? selected.value : "",
                      });
                    }}
                    classNamePrefix="react-select"
                    placeholder="Select grade..."
                    isClearable
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        fontSize: 16,
                        minHeight: "48px",
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Industry
                  </label>
                  <Select
                    isMulti
                    name="industry"
                    options={industryOptions}
                    value={industryOptions.filter((opt) =>
                      (profile.industry || []).includes(opt.value)
                    )}
                    onChange={(selected) => {
                      setDirty(true);
                      setProfile({
                        ...profile,
                        industry: selected
                          ? selected.map((opt) => opt.value)
                          : [],
                      });
                    }}
                    classNamePrefix="react-select"
                    placeholder="Select industry..."
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        fontSize: 16,
                        minHeight: "48px",
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    Service Looking For
                  </label>
                  <Select
                    isMulti
                    name="serviceLookingFor"
                    options={serviceOptions}
                    value={serviceOptions.filter((opt) =>
                      (profile.serviceLookingFor || []).includes(opt.value)
                    )}
                    onChange={(selected) => {
                      setDirty(true);
                      setProfile({
                        ...profile,
                        serviceLookingFor: selected
                          ? selected.map((opt) => opt.value)
                          : [],
                      });
                    }}
                    classNamePrefix="react-select"
                    placeholder="Select services..."
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        fontSize: 16,
                        minHeight: "48px",
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                boxShadow: "0 4px 24px rgba(138,203,219,0.18)",
                border: "2px solid #8ACBDB",
                padding: 32,
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  color: "#007CA6",
                  fontWeight: 800,
                  fontSize: 24,
                  marginBottom: 24,
                }}
              >
                Social Links
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 24,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    GitHub
                  </label>
                  <input
                    name="github"
                    value={profile.github || ""}
                    onChange={handleChange}
                    placeholder="https://github.com/username"
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#007CA6",
                    }}
                  >
                    LinkedIn
                  </label>
                  <input
                    name="linkedin"
                    value={profile.linkedin || ""}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/username"
                    style={{
                      width: "100%",
                      fontSize: 16,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: 12,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Availability and Resume */}
          <div style={{ flex: "1", minWidth: 300 }}>
            {/* Availability */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                boxShadow: "0 4px 24px rgba(138,203,219,0.18)",
                border: "2px solid #8ACBDB",
                padding: 24,
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  color: "#007CA6",
                  fontWeight: 800,
                  fontSize: 20,
                  marginBottom: 16,
                }}
              >
                General Availability
              </h2>
              <AvailabilityForm
                selectedSlots={selectedSlots}
                onAvailabilityChange={handleAvailabilityChange}
              />
            </div>

            {/* Resume Section */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                boxShadow: "0 4px 24px rgba(138,203,219,0.18)",
                border: "2px solid #8ACBDB",
                padding: 32,
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  color: "#007CA6",
                  fontWeight: 800,
                  fontSize: 24,
                  marginBottom: 24,
                }}
              >
                Resume
              </h2>

              {profile.resumeUrl && (
                <div>
                  <button
                    style={{
                      color: "#007CA6",
                      fontWeight: 600,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: 16,
                    }}
                    onClick={() => setShowResumeModal(true)}
                  >
                    View Current Resume
                  </button>
                </div>
              )}
            </div>

            {/* Save Button */}
            {dirty && (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  boxShadow: "0 4px 24px rgba(138,203,219,0.18)",
                  border: "2px solid #8ACBDB",
                  padding: 32,
                }}
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: "100%",
                    fontSize: 18,
                    padding: "16px 32px",
                    borderRadius: 10,
                    background: saving ? "#ccc" : "#007CA6",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resume Modal */}
        {showResumeModal && profile.resumeUrl && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.7)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 24,
                maxWidth: "90vw",
                maxHeight: "90vh",
                boxShadow: "0 2px 32px rgba(0,0,0,0.20)",
                position: "relative",
              }}
            >
              <button
                onClick={() => setShowResumeModal(false)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 18,
                  fontSize: 24,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#d32f2f",
                  zIndex: 2001,
                }}
                aria-label="Close"
              >
                ×
              </button>
              <iframe
                src={profile.resumeUrl}
                title="Resume"
                style={{ width: "70vw", height: "80vh", border: "none" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
