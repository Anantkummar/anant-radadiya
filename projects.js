import { watchProjects, errorMessage } from './shared-data.js';
import { defaultPortfolioProjects } from './project-defaults.js';
const projectList = document.querySelector('#project-list');
const projectTotal = document.querySelector('#project-total');
const projectStatus = document.createElement('p');
projectStatus.setAttribute('role', 'status');
projectList.before(projectStatus);
let portfolioProjects = [];
const createProjectLink = (label, url, className, iconClass) => {
  if (!url) return null;
  try {
    if (!['http:', 'https:'].includes(new URL(url, location.href).protocol)) return null;
  } catch { return null; }
  const link = document.createElement('a');
  link.className = className;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  const icon = document.createElement('i');
  icon.className = iconClass;
  link.append(icon, document.createTextNode(` ${label}`));
  return link;
};


const renderProjects = () => {
  projectList.replaceChildren();
  projectTotal.textContent = String(portfolioProjects.length).padStart(2, '0');

  portfolioProjects.forEach((project, index) => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.dataset.category = project.category;
    const selectedCategory = document.querySelector('.project-filters button[aria-selected="true"]')?.dataset.category || 'all';
    card.hidden = selectedCategory !== 'all' && project.category !== selectedCategory;
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
    });

    const visual = document.createElement('div');
    visual.className = 'project-visual';
    if (project.image) {
      const image = document.createElement('img');
      image.src = project.image;
      image.alt = `${project.title} preview`;
      image.loading = 'lazy';
      visual.append(image);
    } else {
      const icon = document.createElement('span');
      icon.className = 'project-icon';
      icon.textContent = project.icon || '◇';
      visual.append(icon);
    }
    const number = document.createElement('small');
    number.textContent = String(index + 1).padStart(2, '0');
    visual.append(number);

    const body = document.createElement('div');
    body.className = 'project-body';
    const category = document.createElement('span');
    category.className = 'project-category';
    category.textContent = project.label;
    const title = document.createElement('h3');
    title.textContent = project.title;
    const description = document.createElement('p');
    description.textContent = project.description;
    const technologyList = document.createElement('div');
    technologyList.className = 'project-tech';
    (project.technologies || []).forEach((technology) => {
      const tag = document.createElement('span');
      tag.textContent = technology;
      technologyList.append(tag);
    });
    body.append(category, title, description, technologyList);

    const links = document.createElement('div');
    links.className = 'project-links';
    const sourceLink = createProjectLink('Source Code', project.sourceCode, 'source-link', 'fa-brands fa-github');
    const demoLink = createProjectLink('Live Demo', project.liveDemo, 'demo-link', 'fa-solid fa-arrow-up-right-from-square');
    if (sourceLink) links.append(sourceLink);
    if (demoLink) {
      links.append(demoLink);
    }
    body.append(links);

    card.append(visual, body);
    projectList.append(card);
  });

};

projectStatus.textContent = 'Loading projects...';
watchProjects(data => {
  portfolioProjects = data.items === null ? defaultPortfolioProjects : data.items;
  projectStatus.textContent = portfolioProjects.length ? '' : 'New projects coming soon.';
  renderProjects();
}, error => {
  projectStatus.textContent = `Projects are temporarily unavailable. ${errorMessage(error)}`;
});
