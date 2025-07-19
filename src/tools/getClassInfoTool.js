/**
 * Get Class Info Tool
 * Allows the AI to retrieve detailed information about classes
 */

const getClassInfoTool = {
  name: "get_class_info",
  description: "Get detailed information about a class, including requirements, materials, location, and preparation",
  parameters: {
    type: "object",
    properties: {
      infoType: {
        type: "string",
        description: "Type of information requested",
        enum: [
          "name",
          "description",
          "requirements",
          "materials", 
          "location",
          "preparation",
          "schedule",
          "instructor",
          "syllabus",
          "homework",
          "all"
        ]
      },
      className: {
        type: "string",
        description: "Name of the class to get information about"
      },
      specificQuestion: {
        type: "string",
        description: "Specific question the student asked about the class"
      }
    },
    required: ["infoType"]
  },

  /**
   * Execute the get class info tool
   * @param {Object} args - Tool arguments
   * @param {Object} context - Context with session data, services, etc.
   * @returns {Promise<Object>} Execution result
   */
  async execute(args, context) {
    const { infoType, className, specificQuestion } = args;
    const { sessionData } = context;

    console.log(`AI requesting class info: ${infoType}`, args);

    // Get class name from session if not provided
    const targetClass = className || sessionData?.studentInfo?.className || "your class";

    // Simulate class information database
    const classInfoDatabase = {
      "Programming Proficiency": {
        name: "Programming Proficiency",
        description: "Learn the basics of programming and build your first web app",
        requirements: "Basic computer literacy, willingness to learn coding fundamentals",
        materials: "Laptop with internet connection, code editor (VS Code recommended), notebook for taking notes",
        location: "Online via Zoom - link will be sent 30 minutes before class",
        preparation: "Please ensure your laptop is charged and you have a stable internet connection. Review any pre-class materials sent via email",
        schedule: "Mondays and Wednesdays, 10:00 AM - 12:00 PM",
        instructor: "Sarah Johnson - Senior Software Developer with 8 years experience",
        syllabus: "Week 1-2: HTML/CSS basics, Week 3-4: JavaScript fundamentals, Week 5-6: Building your first web app",
        homework: "Weekly coding exercises and one final project to build a personal website"
      },
      "Data Science Fundamentals": {
        name: "Data Science Fundamentals",
        description: "Learn the basics of data science and build your first data analysis project",
        requirements: "Basic math skills, curiosity about data analysis",
        materials: "Computer with Python installed, Jupyter notebooks, calculator",
        location: "Hybrid - Room 205 or online option available",
        preparation: "Install Python and Jupyter notebooks using our setup guide",
        schedule: "Tuesdays and Thursdays, 2:00 PM - 4:00 PM", 
        instructor: "Dr. Michael Chen - Data Science PhD with industry experience",
        syllabus: "Statistics basics, Python for data analysis, visualization, machine learning intro",
        homework: "Data analysis projects using real-world datasets"
      },
      "Digital Marketing Essentials": {
        name: "Digital Marketing Essentials",
        description: "Learn the basics of digital marketing and build your first social media campaign",
        requirements: "Interest in marketing, basic computer skills",
        materials: "Laptop, access to social media accounts for practice",
        location: "Conference Room A, Building 2",
        preparation: "Think about brands you follow and what makes their marketing effective",
        schedule: "Fridays, 1:00 PM - 5:00 PM",
        instructor: "Lisa Rodriguez - Marketing Director with 10+ years experience",
        syllabus: "Social media strategy, content creation, analytics, email marketing",
        homework: "Create marketing campaigns for fictional products"
      },
      "Fullstack Development Bootcamp": {
        name: "Fullstack Development Bootcamp",
        description: "Learn to build web applications from scratch",
        requirements: "Basic computer literacy, willingness to learn coding fundamentals",
        materials: "Laptop with internet connection, code editor (VS Code recommended), notebook for taking notes",
        location: "Online via Zoom - link will be sent 30 minutes before class",
        preparation: "Please ensure your laptop is charged and you have a stable internet connection. Review any pre-class materials sent via email",
        schedule: "Mondays and Wednesdays, 10:00 AM - 12:00 PM",
        instructor: "Callum Bir - Senior Software Developer with more than 20 years experience of integrating AI into his work",
        syllabus: "Week 1-2: HTML/CSS basics, Week 3-4: JavaScript fundamentals, Week 5-6: Building your first web app",
        homework: "Weekly coding exercises and one final project to build a personal website"
      }
    };

    // Get class info or use generic info
    const classInfo = classInfoDatabase[targetClass] || {
      name: targetClass,
      description: "No information available for this class",
      requirements: "Will be provided by your instructor",
      materials: "Material list will be sent before class starts",
      location: "Location details will be confirmed closer to class date",
      preparation: "Preparation instructions will be emailed to you",
      schedule: "Schedule confirmed in your enrollment confirmation",
      instructor: "Instructor information will be provided soon",
      syllabus: "Detailed syllabus available on the student portal",
      homework: "Assignment details will be covered in the first class"
    };

    let responseInfo = "";
    let detailedInfo = {};

    switch (infoType) {
      case "name":
        responseInfo = `The name of the class is: ${classInfo.name}`;
        detailedInfo = { name: classInfo.name };
        break;

      case "description":
        responseInfo = `The description of the class is: ${classInfo.description}`;
        detailedInfo = { description: classInfo.description };
        break;

      case "requirements":
        responseInfo = `For ${targetClass}, the requirements are: ${classInfo.requirements}`;
        detailedInfo = { requirements: classInfo.requirements };
        break;

      case "materials":
        responseInfo = `For ${targetClass}, you'll need: ${classInfo.materials}`;
        detailedInfo = { materials: classInfo.materials };
        break;

      case "location":
        responseInfo = `${targetClass} will be held at: ${classInfo.location}`;
        detailedInfo = { location: classInfo.location };
        break;

      case "preparation":
        responseInfo = `To prepare for ${targetClass}: ${classInfo.preparation}`;
        detailedInfo = { preparation: classInfo.preparation };
        break;

      case "schedule":
        responseInfo = `${targetClass} meets: ${classInfo.schedule}`;
        detailedInfo = { schedule: classInfo.schedule };
        break;

      case "instructor":
        responseInfo = `Your ${targetClass} instructor is: ${classInfo.instructor}`;
        detailedInfo = { instructor: classInfo.instructor };
        break;

      case "syllabus":
        responseInfo = `The ${targetClass} syllabus covers: ${classInfo.syllabus}`;
        detailedInfo = { syllabus: classInfo.syllabus };
        break;

      case "homework":
        responseInfo = `For ${targetClass} homework: ${classInfo.homework}`;
        detailedInfo = { homework: classInfo.homework };
        break;

      case "all":
        responseInfo = `Here's complete information for ${targetClass}: Location: ${classInfo.location}. Materials needed: ${classInfo.materials}. Schedule: ${classInfo.schedule}. Instructor: ${classInfo.instructor}.`;
        detailedInfo = classInfo;
        break;

      default:
        responseInfo = `I can provide information about requirements, materials, location, preparation, schedule, instructor, syllabus, or homework for ${targetClass}. What specifically would you like to know?`;
        detailedInfo = { available: Object.keys(classInfo) };
    }

    // Log the information request
    if (sessionData) {
      if (!sessionData.infoRequests) {
        sessionData.infoRequests = [];
      }
      sessionData.infoRequests.push({
        infoType,
        className: targetClass,
        specificQuestion,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      action: "get_class_info",
      infoType,
      className: targetClass,
      responseInfo,
      detailedInfo,
      specificQuestion
    };
  }
};

export default getClassInfoTool; 
