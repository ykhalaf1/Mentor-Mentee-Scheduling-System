import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { auth, db, storage } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import MentorMatchesModal from "./MentorMatchesModal.js";
import AvailabilityForm from "./AvailibilityForm.jsx";
import GoogleOAuth from "./GoogleOAuth";
import axios from "axios";

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

const initialState = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  industry: [],
  major: "",
  currentGrade: "",
  serviceLookingFor: "",
  skillsToLearn: [], // Add this new field
  companySizePreference: [], // Add this new field
  resume: null,
  password: "",
  confirmPassword: "",
  github: "",
  linkedin: "",
  timeZone: "",
  country: "",
  university: "",
  generalAvailability: {},
};

function getPasswordStrength(password, name) {
  let score = 0;
  const requirements = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  score = Object.values(requirements).filter(Boolean).length;
  let label = "Weak";
  if (score >= 3) label = "Medium";
  if (score === 4) label = "Strong";
  return { score, label, requirements };
}

function MenteeForm() {
  const [form, setForm] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showPasswordFeedback, setShowPasswordFeedback] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showMentorMatches, setShowMentorMatches] = useState(false);
  const [menteeData, setMenteeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "resume") {
      setForm({ ...form, resume: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleIndustryChange = (selectedOptions) => {
    setForm({
      ...form,
      industry: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
    });
  };

  // Convert availability from Set format to grouped by day format
  const convertAvailabilityToGrouped = (selectedSlots) => {
    const grouped = {};
    selectedSlots.forEach((slot) => {
      const [day, time] = slot.split("-");
      if (!grouped[day]) {
        grouped[day] = [];
      }
      // Convert time format from "9:00 AM" to "9am-10am" format
      const timeMatch = time.match(/(\d+):\d+\s*(AM|PM)/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const period = timeMatch[2];
        const nextHour = hour === 12 ? 1 : hour + 1;
        const nextPeriod = hour === 11 ? "PM" : hour === 12 ? "PM" : period;
        const timeSlot = `${hour}${period === "AM" ? "am" : "pm"}-${nextHour}${nextPeriod === "AM" ? "am" : "pm"}`;
        if (!grouped[day].includes(timeSlot)) {
          grouped[day].push(timeSlot);
        }
      }
    });
    return grouped;
  };

  // Convert grouped availability to Set format for AvailabilityForm
  const convertGroupedToAvailabilitySet = (groupedAvailability) => {
    const selectedSlots = new Set();
    Object.entries(groupedAvailability).forEach(([day, timeSlots]) => {
      timeSlots.forEach((timeSlot) => {
        // Convert "9am-10am" format back to "9:00 AM" format
        const timeMatch = timeSlot.match(/(\d+)(am|pm)/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const period = timeMatch[2].toUpperCase();
          const timeString = `${hour}:00 ${period}`;
          selectedSlots.add(`${day}-${timeString}`);
        }
      });
    });
    return selectedSlots;
  };

  const handleAvailabilityChange = (selectedSlots) => {
    const groupedAvailability = convertAvailabilityToGrouped(selectedSlots);
    setForm((f) => ({
      ...f,
      generalAvailability: groupedAvailability,
    }));
  };

  const validatePassword = (password) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!validatePassword(form.password)) {
      setPasswordError(
        "Password must be at least 8 characters, include an uppercase letter, a lowercase letter, and a number."
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    // Validate that at least one day has availability selected
    const hasAvailability =
      Object.keys(form.generalAvailability).length > 0 &&
      Object.values(form.generalAvailability).some(
        (slots) => slots && slots.length > 0
      );
    if (!hasAvailability) {
      setPasswordError("Please select at least one available time slot.");
      return;
    }
    // Validate that Google Calendar access has been granted
    if (!form.hasCalendarAccess) {
      setPasswordError(
        "Please grant Google Calendar access to continue. This is required to ensure you receive calendar invitations for mentoring sessions."
      );
      return;
    }
    setPasswordError("");
    setLoading(true);

    try {
      const formData = new FormData();
      // Append all fields except arrays/objects and file
      Object.entries(form).forEach(([key, value]) => {
        if (key === "resume" && value) {
          formData.append("resume", value);
        } else if (
          key === "industry" ||
          key === "generalAvailability" ||
          key === "skillsToLearn" ||
          key === "companySizePreference"
        ) {
          formData.append(key, JSON.stringify(value));
        } else if (key !== "resume") {
          formData.append(key, value);
        }
      });

      const response = await axios.post(
        "http://localhost:3001/api/mentee",
        formData
      );
      const data = response.data;

      if (data.success) {
        // Store mentee data for pairing
        setMenteeData({
          ...form,
          uid: data.uid,
          resumeUrl: data.resumeUrl,
        });

        // Fetch mentors for pairing
        const mentorsResponse = await axios.get(
          "http://localhost:3001/api/mentors"
        );
        const mentorsData = mentorsResponse.data;

        if (mentorsData.success) {
          setShowMentorMatches(true);
        } else {
          // If no mentors available, proceed with normal submission
          setSubmitted(true);
          setTimeout(() => navigate("/mentee-dashboard"), 10000);
        }
      } else {
        if (data.error && data.error.includes("already exists")) {
          setPasswordError(
            "An account with this email already exists. Please login to the user portal instead."
          );
        } else {
          setPasswordError("Error: " + (data.error || "Could not add mentee"));
        }
      }
    } catch (err) {
      setPasswordError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingSubmit = async (meetingData) => {
    try {
      console.log("Submitting meeting data:", meetingData);

      const response = await axios.post(
        "http://localhost:3001/api/meetings",
        meetingData
      );

      console.log("Meeting submission response:", response.data);

      if (response.data.success) {
        console.log("Meeting successfully saved to database");
        setSubmitted(true);
        setTimeout(() => navigate("/mentee-dashboard"), 10000);
      } else {
        setPasswordError(
          "Error scheduling meeting: " +
            (response.data.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Meeting submission error:", error);
      setPasswordError("Network error scheduling meeting: " + error.message);
    }
  };

  if (submitted) {
    return (
      <div className="container">
        <div className="form-card">
          <h2>Application Submitted</h2>
          <p>
            Redirect in 10 secs, login with the email and password you inputted
            in the form.
          </p>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(form.password, form.name);

  const skillsToLearnOptions = [
    { value: "Technical Skills", label: "Technical Skills" },
    { value: "Leadership", label: "Leadership" },
    { value: "Communication", label: "Communication" },
    { value: "Public Speaking", label: "Public Speaking" },
    { value: "Project Management", label: "Project Management" },
    { value: "Problem Solving", label: "Problem Solving" },
    { value: "Critical Thinking", label: "Critical Thinking" },
    { value: "Time Management", label: "Time Management" },
    { value: "Teamwork", label: "Teamwork" },
    { value: "Negotiation", label: "Negotiation" },
    { value: "Sales Skills", label: "Sales Skills" },
    { value: "Marketing", label: "Marketing" },
    { value: "Financial Literacy", label: "Financial Literacy" },
    { value: "Data Analysis", label: "Data Analysis" },
    { value: "Research Skills", label: "Research Skills" },
    { value: "Networking", label: "Networking" },
    { value: "Confidence Building", label: "Confidence Building" },
    { value: "Interview Skills", label: "Interview Skills" },
    { value: "Resume Writing", label: "Resume Writing" },
    { value: "Career Planning", label: "Career Planning" },
    { value: "Entrepreneurship", label: "Entrepreneurship" },
    { value: "Innovation", label: "Innovation" },
    { value: "Strategic Thinking", label: "Strategic Thinking" },
    { value: "Customer Service", label: "Customer Service" },
    { value: "Conflict Resolution", label: "Conflict Resolution" },
    { value: "Mentoring Others", label: "Mentoring Others" },
    {
      value: "Cross-cultural Communication",
      label: "Cross-cultural Communication",
    },
    { value: "Digital Marketing", label: "Digital Marketing" },
    { value: "Social Media Management", label: "Social Media Management" },
    { value: "Content Creation", label: "Content Creation" },
    { value: "Design Thinking", label: "Design Thinking" },
    { value: "Agile/Scrum", label: "Agile/Scrum" },
    { value: "Risk Management", label: "Risk Management" },
    { value: "Quality Assurance", label: "Quality Assurance" },
    { value: "Supply Chain Management", label: "Supply Chain Management" },
    { value: "Human Resources", label: "Human Resources" },
    { value: "Legal Knowledge", label: "Legal Knowledge" },
    { value: "Regulatory Compliance", label: "Regulatory Compliance" },
    { value: "Sustainability", label: "Sustainability" },
    { value: "Remote Work Skills", label: "Remote Work Skills" },
    { value: "Virtual Collaboration", label: "Virtual Collaboration" },
    { value: "Other", label: "Other" },
  ];

  const companySizeOptions = [
    {
      value: "Small Company (1-50 employees)",
      label: "Small Company (1-50 employees)",
    },
    {
      value: "Medium Company (51-500 employees)",
      label: "Medium Company (51-500 employees)",
    },
    {
      value: "Large Company (500+ employees)",
      label: "Large Company (500+ employees)",
    },
  ];

  return (
    <div className="mentee-form">
      <div className="container">
        <div className="form-card scrollable-form">
          <h2>Mentee Application</h2>
          <form onSubmit={handleContinue}>
            <label>
              First Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
            />

            <label>Middle Name</label>
            <input
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
            />

            <label>
              Last Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
            />

            <label>
              Email <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label>
              Phone number <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />

            <label>
              Industry <span style={{ color: "red" }}>*</span>
            </label>
            <Select
              isMulti
              name="industry"
              options={industryOptions}
              value={industryOptions.filter((opt) =>
                form.industry.includes(opt.value)
              )}
              onChange={handleIndustryChange}
              classNamePrefix="react-select"
              placeholder="Select industry..."
              required
            />
            <div
              style={{ fontSize: "0.95rem", color: "#888", marginBottom: 12 }}
            >
              You can select multiple industries.
            </div>

            <label>
              Major <span style={{ color: "red" }}>*</span>
            </label>
            <Select
              name="major"
              options={majorOptions}
              value={
                majorOptions.find((opt) => opt.value === form.major) || null
              }
              onChange={(selected) =>
                setForm({ ...form, major: selected ? selected.value : "" })
              }
              classNamePrefix="react-select"
              placeholder="Select major..."
              isClearable
              required
            />

            <label>
              Current grade <span style={{ color: "red" }}>*</span>
            </label>
            <select
              name="currentGrade"
              value={form.currentGrade}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select your current grade
              </option>
              <option value="Highschooler">Highschooler</option>
              <option value="Freshman in college">Freshman in college</option>
              <option value="Sophomore in college">Sophomore in college</option>
              <option value="Junior in college">Junior in college</option>
              <option value="Senior in college">Senior in college</option>
              <option value="Graduated">Graduated</option>
            </select>

            <label>
              What service are you looking for?{" "}
              <span style={{ color: "red" }}>*</span>
            </label>
            <select
              name="serviceLookingFor"
              value={form.serviceLookingFor}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select a service
              </option>
              <option value="Career advice">Career advice</option>
              <option value="Resume review">Resume review</option>
              <option value="Interview prep">Interview prep</option>
            </select>

            <label>
              What skills do you want to learn from your mentor?{" "}
              <span style={{ color: "red" }}>*</span>
            </label>
            <Select
              isMulti
              name="skillsToLearn"
              options={skillsToLearnOptions}
              value={skillsToLearnOptions.filter((opt) =>
                (form.skillsToLearn || []).includes(opt.value)
              )}
              onChange={(selectedOptions) => {
                setForm({
                  ...form,
                  skillsToLearn: selectedOptions
                    ? selectedOptions.map((opt) => opt.value)
                    : [],
                });
              }}
              classNamePrefix="react-select"
              placeholder="Select skills you want to learn..."
              required
            />
            <div
              style={{ fontSize: "0.95rem", color: "#888", marginBottom: 12 }}
            >
              You can select multiple skills. This helps us match you with the
              best mentors.
            </div>

            <label>
              What company size would you prefer to work for?{" "}
              <span style={{ color: "red" }}>*</span>
            </label>
            <Select
              isMulti
              name="companySizePreference"
              options={companySizeOptions}
              value={companySizeOptions.filter((opt) =>
                (form.companySizePreference || []).includes(opt.value)
              )}
              onChange={(selectedOptions) => {
                setForm({
                  ...form,
                  companySizePreference: selectedOptions
                    ? selectedOptions.map((opt) => opt.value)
                    : [],
                });
              }}
              classNamePrefix="react-select"
              placeholder="Select company size preferences..."
              required
            />
            <div
              style={{ fontSize: "0.95rem", color: "#888", marginBottom: 12 }}
            >
              You can select multiple preferences. This helps us match you with
              mentors from your preferred company types.
            </div>

            {/* General Availability Section */}
            <div style={{ margin: "16px 0 8px 0" }}>
              <label
                style={{
                  fontWeight: "bold",
                  fontSize: "1em",
                  color: "#007399",
                  marginBottom: 2,
                  display: "inline-block",
                }}
              >
                General Availability <span style={{ color: "red" }}>*</span>
              </label>
              <div
                style={{
                  background: "#ededed",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  padding: "16px",
                  marginTop: 4,
                }}
              >
                <AvailabilityForm
                  selectedSlots={convertGroupedToAvailabilitySet(
                    form.generalAvailability
                  )}
                  onAvailabilityChange={handleAvailabilityChange}
                />
              </div>
            </div>

            <label>GitHub (optional)</label>
            <input
              name="github"
              value={form.github || ""}
              onChange={handleChange}
              placeholder="GitHub profile URL"
            />

            <label>LinkedIn (optional)</label>
            <input
              name="linkedin"
              value={form.linkedin || ""}
              onChange={handleChange}
              placeholder="LinkedIn profile URL"
            />

            <label>Time zone (optional)</label>
            <input
              name="timeZone"
              value={form.timeZone || ""}
              onChange={handleChange}
              placeholder="e.g. EST, PST, GMT+3"
            />

            <label>Country (optional)</label>
            <input
              name="country"
              value={form.country || ""}
              onChange={handleChange}
              placeholder="Country"
            />

            <label>University (optional)</label>
            <input
              name="university"
              value={form.university || ""}
              onChange={handleChange}
              placeholder="University name"
            />

            <label>
              Resume <span style={{ color: "red" }}>*</span>
            </label>
            <input
              name="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleChange}
              required
            />
            {form.resume && (
              <div style={{ marginBottom: 16, fontSize: "1.1rem" }}>
                Selected file: {form.resume.name}
              </div>
            )}

            <label>
              Password <span style={{ color: "red" }}>*</span>
            </label>
            <div
              style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
            >
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                style={{ flex: 1 }}
                onFocus={() => setShowPasswordFeedback(true)}
                onBlur={() => setShowPasswordFeedback(false)}
              />
              <button
                type="button"
                style={{
                  marginLeft: 8,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
                onClick={() => setShowPassword((v) => !v)}
              >
                <span role="img" aria-label="Show password">
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </button>
            </div>
            {/* Password Strength Bar and Requirements */}
            {showPasswordFeedback && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    height: 8,
                    background: "#eee",
                    borderRadius: 4,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      height: "100%",
                      borderRadius: 4,
                      background:
                        passwordStrength.label === "Strong"
                          ? "#4caf50"
                          : passwordStrength.label === "Medium"
                            ? "#ff9800"
                            : "#f44336",
                      transition: "width 0.3s",
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    fontWeight: "bold",
                    color:
                      passwordStrength.label === "Strong"
                        ? "#4caf50"
                        : passwordStrength.label === "Medium"
                          ? "#ff9800"
                          : "#f44336",
                  }}
                >
                  {passwordStrength.label} password
                </div>
                <ul
                  style={{
                    fontSize: "0.95rem",
                    margin: "8px 0 0 0",
                    paddingLeft: 18,
                  }}
                >
                  <li
                    style={{
                      color: passwordStrength.requirements.length
                        ? "#4caf50"
                        : "#f44336",
                    }}
                  >
                    At least 8 characters
                  </li>
                  <li
                    style={{
                      color: passwordStrength.requirements.upper
                        ? "#4caf50"
                        : "#f44336",
                    }}
                  >
                    At least one uppercase letter
                  </li>
                  <li
                    style={{
                      color: passwordStrength.requirements.lower
                        ? "#4caf50"
                        : "#f44336",
                    }}
                  >
                    At least one lowercase letter
                  </li>
                  <li
                    style={{
                      color: passwordStrength.requirements.special
                        ? "#4caf50"
                        : "#f44336",
                    }}
                  >
                    At least one special character
                  </li>
                </ul>
              </div>
            )}

            <label>
              Confirm Password <span style={{ color: "red" }}>*</span>
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                required
                style={{ flex: 1 }}
                onFocus={() => {
                  setConfirmPasswordTouched(true);
                  setConfirmPasswordFocused(true);
                }}
                onBlur={() => setConfirmPasswordFocused(false)}
              />
              <button
                type="button"
                style={{
                  marginLeft: 8,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
                onClick={() => setShowConfirmPassword((v) => !v)}
              >
                <span role="img" aria-label="Show password">
                  {showConfirmPassword ? "🙈" : "👁️"}
                </span>
              </button>
            </div>
            {confirmPasswordFocused && form.confirmPassword && (
              <div
                style={{
                  color:
                    form.password === form.confirmPassword
                      ? "#4caf50"
                      : "#f44336",
                  marginBottom: 12,
                  fontWeight: "bold",
                }}
              >
                {form.password === form.confirmPassword
                  ? "Passwords match"
                  : "Passwords do not match"}
              </div>
            )}
            {passwordError && (
              <div style={{ color: "red", marginBottom: 16 }}>
                {passwordError}
              </div>
            )}

            {/* Google Calendar OAuth Integration */}
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <label>
                Google Calendar Access <span style={{ color: "red" }}>*</span>
              </label>
              <p
                style={{ fontSize: "0.95rem", color: "#666", marginBottom: 16 }}
              >
                We need access to your Google Calendar to automatically add
                mentoring sessions when meetings are confirmed. This ensures you
                never miss a session.
              </p>
              <GoogleOAuth
                userId={form.email} // Use email as the identifier for OAuth
                userEmail={form.email}
                onAuthSuccess={(userId) => {
                  console.log(
                    "Mentee calendar access granted for user:",
                    userId
                  );
                  setForm((prev) => ({ ...prev, hasCalendarAccess: true }));
                }}
                onAuthError={(error) => {
                  console.log("Mentee calendar access failed:", error);
                  setForm((prev) => ({ ...prev, hasCalendarAccess: false }));
                }}
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Continue"}
            </button>
          </form>
        </div>

        {/* Mentor Matches Modal */}
        {showMentorMatches && menteeData && (
          <MentorMatchesModal
            menteeData={menteeData}
            onClose={() => {
              setShowMentorMatches(false);
              setSubmitted(true);
              setTimeout(() => navigate("/mentee-dashboard"), 10000);
            }}
            onSubmit={handleMeetingSubmit}
          />
        )}
      </div>
    </div>
  );
}

export default MenteeForm;
