const demoProjects = {
  yelpcamp: {
    icon: "🏕️",
    type: "Full-Stack Project",
    title: "YelpCamp",
    description: "A camping community platform created for discovering, reviewing, and sharing memorable destinations."
  },
  "school-management": {
    icon: "📊",
    type: "Backend Project",
    title: "School Management System",
    description: "A streamlined dashboard for managing students, teachers, attendance, grades, and academic results."
  },
  portfolio: {
    icon: "◈",
    type: "Frontend Project",
    title: "Premium Dev Portfolio",
    description: "A modern portfolio experience focused on responsive design, clarity, and smooth interactions."
  }
};

const projectKey = new URLSearchParams(window.location.search).get('project');
const project = demoProjects[projectKey] || {
  icon: "◇",
  type: "Featured Project",
  title: "Project Demo",
  description: "Your live project will appear here after you add its URL."
};

document.title = `${project.title} Demo — Anantkumar Radadiya`;
document.querySelector('#demo-icon').textContent = project.icon;
document.querySelector('#demo-type').textContent = project.type;
document.querySelector('#demo-title').textContent = project.title;
document.querySelector('#demo-description').textContent = project.description;
