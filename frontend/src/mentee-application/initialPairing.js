// Initial Pairing Algorithm
// Updated scoring weights for different criteria
const WEIGHTS = {
  MAJOR: 40,        // Increased from 30 - most important
  INDUSTRY: 35,     // Increased from 30 - second most important
  SKILLS: 20,       // Decreased from 25 - third priority
  HELP_IN: 5,       // Decreased from 30 - low priority
  COMPANY_SIZE: 5   // Decreased from 20 - lowest priority
};

// Total possible score
const TOTAL_POSSIBLE_SCORE = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);

// Helper function to normalize text for comparison
const normalizeText = (text) => {
  return text.toLowerCase().trim();
};

// Helper function to find common elements between arrays
const findCommonElements = (array1, array2) => {
  if (!Array.isArray(array1) || !Array.isArray(array2)) return [];
  const normalized1 = array1.map(item => normalizeText(item));
  const normalized2 = array2.map(item => normalizeText(item));
  return normalized1.filter(item => normalized2.includes(item));
};

// Helper function to calculate partial matches
const calculatePartialMatch = (mentorText, menteeText) => {
  if (!mentorText || !menteeText) return 0;
  
  const mentorWords = normalizeText(mentorText).split(/[,\s]+/);
  const menteeWords = normalizeText(menteeText).split(/[,\s]+/);
  
  let matches = 0;
  mentorWords.forEach(word => {
    if (menteeWords.some(menteeWord => 
      menteeWord.includes(word) || word.includes(menteeWord)
    )) {
      matches++;
    }
  });
  
  return matches / Math.max(mentorWords.length, menteeWords.length);
};

// Enhanced major categories for better matching
const MAJOR_CATEGORIES = {
  'computer': ['computer science', 'computer engineering', 'information technology', 'software engineering', 'data science', 'cybersecurity'],
  'business': ['business administration', 'business management', 'economics', 'finance', 'accounting', 'marketing', 'entrepreneurship'],
  'engineering': ['mechanical engineering', 'electrical engineering', 'civil engineering', 'chemical engineering', 'biomedical engineering', 'industrial engineering'],
  'science': ['biology', 'chemistry', 'physics', 'mathematics', 'statistics', 'environmental science'],
  'medicine': ['biology', 'chemistry', 'pre-medicine', 'pre-med', 'nursing', 'pharmacy', 'public health'],
  'arts': ['art', 'design', 'music', 'theater', 'film', 'creative writing', 'graphic design'],
  'education': ['education', 'teaching', 'early childhood education', 'special education', 'educational psychology'],
  'social_sciences': ['psychology', 'sociology', 'political science', 'anthropology', 'social work', 'criminal justice']
};

// Enhanced industry categories
const INDUSTRY_CATEGORIES = {
  'technology': ['information technology', 'software', 'hardware', 'ai', 'machine learning', 'data analytics'],
  'healthcare': ['healthcare', 'medical', 'pharmaceuticals', 'biotechnology', 'health services'],
  'finance': ['finance', 'banking', 'insurance', 'investment', 'accounting', 'consulting'],
  'education': ['education', 'training', 'edtech', 'academic', 'research'],
  'manufacturing': ['manufacturing', 'automotive', 'aerospace', 'industrial', 'supply chain'],
  'retail': ['retail', 'e-commerce', 'consumer goods', 'fashion', 'luxury'],
  'government': ['government', 'public sector', 'non-profit', 'policy', 'public administration'],
  'media': ['media', 'entertainment', 'publishing', 'advertising', 'communications']
};

// Enhanced skills categories
const SKILLS_CATEGORIES = {
  'technical': ['programming', 'software development', 'data analysis', 'machine learning', 'cybersecurity', 'cloud computing'],
  'leadership': ['leadership', 'management', 'team building', 'project management', 'strategic planning'],
  'communication': ['communication', 'public speaking', 'presentation', 'writing', 'negotiation'],
  'business': ['business strategy', 'marketing', 'sales', 'finance', 'operations', 'strategy'],
  'creative': ['design thinking', 'creativity', 'innovation', 'problem solving', 'critical thinking'],
  'soft_skills': ['time management', 'organization', 'adaptability', 'emotional intelligence', 'collaboration']
};

// Calculate major match score with improved categorization
const calculateMajorScore = (mentorMajor, menteeMajor) => {
  if (!mentorMajor || !menteeMajor) return 0;
  
  const mentorNorm = normalizeText(mentorMajor);
  const menteeNorm = normalizeText(menteeMajor);
  
  // Exact match
  if (mentorNorm === menteeNorm) return WEIGHTS.MAJOR;
  
  // Partial match (e.g., "Computer Science" vs "Computer Engineering")
  if (mentorNorm.includes(menteeNorm) || menteeNorm.includes(mentorNorm)) {
    return WEIGHTS.MAJOR * 0.9;
  }
  
  // Check category matches
  for (const [category, fields] of Object.entries(MAJOR_CATEGORIES)) {
    const mentorInCategory = fields.some(field => mentorNorm.includes(field));
    const menteeInCategory = fields.some(field => menteeNorm.includes(field));
    
    if (mentorInCategory && menteeInCategory) {
      return WEIGHTS.MAJOR * 0.8;
    }
    
    // Check for related categories
    if (mentorInCategory || menteeInCategory) {
      // Find related categories
      const relatedCategories = {
        'computer': ['engineering', 'science'],
        'business': ['finance', 'social_sciences'],
        'engineering': ['computer', 'science'],
        'science': ['engineering', 'medicine'],
        'medicine': ['science', 'healthcare'],
        'arts': ['media', 'creative'],
        'education': ['social_sciences', 'psychology'],
        'social_sciences': ['education', 'business']
      };
      
      if (relatedCategories[category]) {
        const hasRelated = relatedCategories[category].some(relCat => {
          const relFields = MAJOR_CATEGORIES[relCat] || [];
          return relFields.some(field => 
            (mentorInCategory && menteeNorm.includes(field)) || 
            (menteeInCategory && mentorNorm.includes(field))
          );
        });
        
        if (hasRelated) {
          return WEIGHTS.MAJOR * 0.6;
        }
      }
    }
  }
  
  return 0;
};

// Calculate industry match score with improved categorization
const calculateIndustryScore = (mentorIndustry, menteeIndustry) => {
  if (!mentorIndustry || !menteeIndustry) return 0;
  
  const mentorIndustries = Array.isArray(mentorIndustry) ? mentorIndustry : [mentorIndustry];
  const menteeIndustries = Array.isArray(menteeIndustry) ? menteeIndustry : [menteeIndustry];
  
  const commonIndustries = findCommonElements(mentorIndustries, menteeIndustries);
  
  if (commonIndustries.length > 0) {
    return WEIGHTS.INDUSTRY * (commonIndustries.length / Math.max(mentorIndustries.length, menteeIndustries.length));
  }
  
  // Check category matches for partial scoring
  let categoryScore = 0;
  for (const [category, fields] of Object.entries(INDUSTRY_CATEGORIES)) {
    const mentorInCategory = mentorIndustries.some(industry => 
      fields.some(field => normalizeText(industry).includes(field))
    );
    const menteeInCategory = menteeIndustries.some(industry => 
      fields.some(field => normalizeText(industry).includes(field))
    );
    
    if (mentorInCategory && menteeInCategory) {
      categoryScore = Math.max(categoryScore, WEIGHTS.INDUSTRY * 0.7);
    } else if (mentorInCategory || menteeInCategory) {
      categoryScore = Math.max(categoryScore, WEIGHTS.INDUSTRY * 0.3);
    }
  }
  
  return categoryScore;
};

// Calculate skills match score with improved categorization
const calculateSkillsScore = (mentorSkills, menteeSkills) => {
  if (!mentorSkills || !menteeSkills) return 0;
  
  // Ensure mentorSkills is a string
  const mentorSkillsString = typeof mentorSkills === 'string' ? mentorSkills : String(mentorSkills);
  const mentorSkillsArray = Array.isArray(mentorSkills) ? mentorSkills : mentorSkillsString.split(',').map(s => s.trim());
  const menteeSkillsArray = Array.isArray(menteeSkills) ? menteeSkills : menteeSkills.split(',').map(s => s.trim());
  
  const commonSkills = findCommonElements(mentorSkillsArray, menteeSkillsArray);
  
  if (commonSkills.length > 0) {
    return WEIGHTS.SKILLS * (commonSkills.length / menteeSkillsArray.length);
  }
  
  // Check category matches for partial scoring
  let categoryScore = 0;
  for (const [category, fields] of Object.entries(SKILLS_CATEGORIES)) {
    const mentorInCategory = mentorSkillsArray.some(skill => 
      fields.some(field => normalizeText(skill).includes(field))
    );
    const menteeInCategory = menteeSkillsArray.some(skill => 
      fields.some(field => normalizeText(skill).includes(field))
    );
    
    if (mentorInCategory && menteeInCategory) {
      categoryScore = Math.max(categoryScore, WEIGHTS.SKILLS * 0.6);
    } else if (mentorInCategory || menteeInCategory) {
      categoryScore = Math.max(categoryScore, WEIGHTS.SKILLS * 0.2);
    }
  }
  
  return categoryScore;
};

// Calculate helpIn match score (services)
const calculateHelpInScore = (mentorHelpIn, menteeServiceLookingFor) => {
  if (!mentorHelpIn || !menteeServiceLookingFor) return 0;
  
  // Ensure mentorHelpIn is a string
  const mentorHelpInString = typeof mentorHelpIn === 'string' ? mentorHelpIn : String(mentorHelpIn);
  const mentorServices = mentorHelpInString.split(',').map(s => normalizeText(s.trim()));
  const menteeService = normalizeText(menteeServiceLookingFor);
  
  // Exact match
  if (mentorServices.includes(menteeService)) {
    return WEIGHTS.HELP_IN;
  }
  
  // Partial match
  const partialMatch = calculatePartialMatch(mentorHelpInString, menteeServiceLookingFor);
  if (partialMatch > 0.3) {
    return WEIGHTS.HELP_IN * partialMatch;
  }
  
  return 0;
};

// Calculate company size match score
const calculateCompanySizeScore = (mentorCompanySize, menteeCompanySizePreference) => {
  if (!mentorCompanySize || !menteeCompanySizePreference) return 0;
  
  const mentorSizes = Array.isArray(mentorCompanySize) ? mentorCompanySize : [mentorCompanySize];
  const menteePreferences = Array.isArray(menteeCompanySizePreference) ? menteeCompanySizePreference : [menteeCompanySizePreference];
  
  const commonSizes = findCommonElements(mentorSizes, menteePreferences);
  
  if (commonSizes.length > 0) {
    return WEIGHTS.COMPANY_SIZE * (commonSizes.length / menteePreferences.length);
  }
  
  return 0;
};

// Main scoring function
const calculateTotalScore = (mentor, mentee) => {
  const scores = {
    major: calculateMajorScore(mentor.major, mentee.major),
    industry: calculateIndustryScore(mentor.industry, mentee.industry),
    skills: calculateSkillsScore(mentor.skills, mentee.skillsToLearn),
    helpIn: calculateHelpInScore(mentor.helpIn, mentee.serviceLookingFor),
    companySize: calculateCompanySizeScore(mentor.companySizeExperience, mentee.companySizePreference)
  };
  
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  
  return {
    totalScore,
    breakdown: scores,
    mentor: {
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      yearsOfExperience: mentor.yearsOfExperience,
      companies: mentor.companies,
      skills: mentor.skills,
      helpIn: mentor.helpIn,
      availability: mentor.availability,
      major: mentor.major,
      industry: mentor.industry,
      companySizeExperience: mentor.companySizeExperience
    }
  };
};

// Find top mentors for a mentee
const findTopMentors = (mentee, mentors, limit = 3) => {
  const scoredMentors = mentors.map(mentor => calculateTotalScore(mentor, mentee));
  
  // Sort by total score (highest first) and take top 3
  const topMentors = scoredMentors
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .filter(mentor => mentor.totalScore > 0); // Only return mentors with some match
    
  return topMentors;
};

// Export functions for use in other components
export {
  findTopMentors,
  calculateTotalScore,
  WEIGHTS,
  TOTAL_POSSIBLE_SCORE
}; 