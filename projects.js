const defaultPortfolioProjects = [
  {
    title: "YelpCamp",
    label: "Camping Community",
    category: "full-stack",
    icon: "🏕️",
    image: "",
    description: "A camping community platform with maps, ratings, reviews, authentication, and cloud image uploads.",
    technologies: ["Node.js", "Express", "MongoDB"],
    liveDemo: "project-demo.html?project=yelpcamp",
    sourceCode: ""
  },
  {
    title: "School Management System",
    label: "School Dashboard",
    category: "backend",
    icon: "📊",
    image: "",
    description: "A focused platform for managing students, teachers, grades, results, and attendance schedules.",
    technologies: ["PHP", "JavaScript", "MySQL"],
    liveDemo: "project-demo.html?project=school-management",
    sourceCode: ""
  },
  {
    title: "Premium Dev Portfolio",
    label: "Developer Portfolio",
    category: "frontend",
    icon: "◈",
    image: "",
    description: "A polished portfolio with smooth interactions, responsive layouts, and a consistent visual system.",
    technologies: ["React", "TypeScript", "Tailwind"],
    liveDemo: "project-demo.html?project=portfolio",
    sourceCode: ""
  }
];

const projectList = document.querySelector('#project-list');
const projectTotal = document.querySelector('#project-total');
const projectEditor = document.querySelector('#project-editor');
const projectForm = document.querySelector('#project-form');
const editorTitle = document.querySelector('#editor-title');
const deleteProjectButton = document.querySelector('.delete-project');
const projectStorageKey = 'anantkumar_portfolio_projects';
const projectLock = document.querySelector('#project-lock');
const projectLockForm = document.querySelector('#project-lock-form');
const projectLockPassword = document.querySelector('#project-lock-password');
const projectLockError = document.querySelector('#project-lock-error');
const newPasswordInput = document.querySelector('#project-new-password');
const confirmPasswordInput = document.querySelector('#project-confirm-password');
const changePasswordFields = document.querySelector('#change-password-fields');
const changePasswordButton = document.querySelector('.change-password-toggle');
const unlockSubmitButton = document.querySelector('.project-unlock-submit');
const adminPasswordStorageKey = 'anantkumar_project_admin_password';
const defaultAdminPassword = 'Anant2026';
let pendingProtectedAction = null;
let isChangingPassword = false;

const getAdminPassword = () => localStorage.getItem(adminPasswordStorageKey) || defaultAdminPassword;

const setPasswordMode = (enabled) => {
  isChangingPassword = enabled;
  changePasswordFields.hidden = !enabled;
  newPasswordInput.required = enabled;
  confirmPasswordInput.required = enabled;
  changePasswordButton.textContent = enabled ? 'Back to Unlock' : 'Change Password';
  unlockSubmitButton.innerHTML = enabled
    ? 'Save Password <i class="fa-solid fa-check"></i>'
    : 'Unlock <i class="fa-solid fa-lock-open"></i>';
  projectLockError.textContent = '';
  window.setTimeout(() => (enabled ? newPasswordInput : projectLockPassword).focus(), 50);
};

const requestProjectUnlock = (action) => {
  pendingProtectedAction = action;
  projectLockForm.reset();
  projectLock.querySelectorAll('.password-eye').forEach((button) => {
    button.previousElementSibling.type = 'password';
    button.setAttribute('aria-label', 'Show password');
    button.querySelector('i').className = 'fa-solid fa-eye';
  });
  projectLockError.textContent = '';
  setPasswordMode(false);
  projectLock.showModal();
  window.setTimeout(() => projectLockPassword.focus(), 50);
};

const loadProjects = () => {
  try {
    const savedProjects = JSON.parse(localStorage.getItem(projectStorageKey));
    return Array.isArray(savedProjects) ? savedProjects : defaultPortfolioProjects;
  } catch {
    return defaultPortfolioProjects;
  }
};

let portfolioProjects = loadProjects();

const createProjectLink = (label, url, className, iconClass) => {
  if (!url) return null;
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

const saveProjects = () => {
  localStorage.setItem(projectStorageKey, JSON.stringify(portfolioProjects));
};

const openProjectEditor = (index = null, focusLiveDemo = false) => {
  projectForm.reset();
  projectForm.elements.projectIndex.value = index === null ? '' : String(index);
  editorTitle.textContent = index === null ? 'Add a Project' : 'Edit Project';
  deleteProjectButton.hidden = index === null;

  if (index !== null) {
    const project = portfolioProjects[index];
    projectForm.elements.title.value = project.title || '';
    projectForm.elements.label.value = project.label || '';
    projectForm.elements.category.value = project.category || 'frontend';
    projectForm.elements.icon.value = project.icon || '';
    projectForm.elements.description.value = project.description || '';
    projectForm.elements.technologies.value = (project.technologies || []).join(', ');
    projectForm.elements.image.value = project.image || '';
    projectForm.elements.liveDemo.value = project.liveDemo || '';
    projectForm.elements.sourceCode.value = project.sourceCode || '';
  }

  projectEditor.showModal();
  window.setTimeout(() => {
    (focusLiveDemo ? projectForm.elements.liveDemo : projectForm.elements.title).focus();
  }, 50);
};

const createEditorButton = (index) => {
  const button = document.createElement('button');
  button.className = 'edit-project';
  button.type = 'button';
  button.setAttribute('aria-label', 'Edit project');
  button.innerHTML = '<i class="fa-solid fa-lock"></i> Edit';
  button.addEventListener('click', () => requestProjectUnlock(() => openProjectEditor(index)));
  return button;
};

const renderProjects = () => {
  projectList.replaceChildren();
  projectTotal.textContent = String(portfolioProjects.length).padStart(2, '0');

  portfolioProjects.forEach((project, index) => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.dataset.category = project.category;
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
    visual.append(number, createEditorButton(index));

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
    } else {
      const addDemoButton = document.createElement('button');
      addDemoButton.className = 'add-demo-link';
      addDemoButton.type = 'button';
      addDemoButton.innerHTML = '<i class="fa-solid fa-lock"></i> Add Live Demo';
      addDemoButton.addEventListener('click', () => requestProjectUnlock(() => openProjectEditor(index, true)));
      links.append(addDemoButton);
    }
    body.append(links);

    card.append(visual, body);
    projectList.append(card);
  });

  const addCard = document.createElement('button');
  addCard.className = 'add-project-card';
  addCard.type = 'button';
  addCard.innerHTML = '<span><i class="fa-solid fa-lock"></i></span><strong>Add Your Project</strong><small>Password required to add a project</small>';
  addCard.addEventListener('click', () => requestProjectUnlock(() => openProjectEditor()));
  projectList.append(addCard);
};

projectForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(projectForm);
  const project = {
    title: formData.get('title').trim(),
    label: formData.get('label').trim(),
    category: formData.get('category'),
    icon: formData.get('icon').trim() || '◇',
    image: formData.get('image').trim(),
    description: formData.get('description').trim(),
    technologies: formData.get('technologies').split(',').map((item) => item.trim()).filter(Boolean),
    liveDemo: formData.get('liveDemo').trim(),
    sourceCode: formData.get('sourceCode').trim()
  };
  const indexValue = formData.get('projectIndex');
  if (indexValue === '') portfolioProjects.push(project);
  else portfolioProjects[Number(indexValue)] = project;
  saveProjects();
  renderProjects();
  projectEditor.close();
});

deleteProjectButton.addEventListener('click', () => {
  requestProjectUnlock(() => {
    const index = Number(projectForm.elements.projectIndex.value);
    if (!Number.isInteger(index)) return;
    portfolioProjects.splice(index, 1);
    saveProjects();
    renderProjects();
    projectEditor.close();
  });
});

document.querySelector('.editor-close').addEventListener('click', () => projectEditor.close());
document.querySelector('.cancel-editor').addEventListener('click', () => projectEditor.close());
projectEditor.addEventListener('click', (event) => {
  if (event.target === projectEditor) projectEditor.close();
});

projectLockForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (projectLockPassword.value !== getAdminPassword()) {
    projectLockError.textContent = 'Incorrect password. Please try again.';
    projectLockPassword.select();
    return;
  }
  if (isChangingPassword) {
    const newPassword = newPasswordInput.value;
    if (!/^[A-Za-z0-9]{4,10}$/.test(newPassword)) {
      projectLockError.textContent = 'Use 4–10 letters or numbers only. No symbols.';
      newPasswordInput.select();
      return;
    }
    if (newPassword !== confirmPasswordInput.value) {
      projectLockError.textContent = 'New passwords do not match.';
      confirmPasswordInput.select();
      return;
    }
    localStorage.setItem(adminPasswordStorageKey, newPassword);
    projectLockForm.reset();
    setPasswordMode(false);
    projectLockError.textContent = 'Password changed successfully.';
    return;
  }
  const action = pendingProtectedAction;
  pendingProtectedAction = null;
  projectLock.close();
  if (action) action();
});

const closeProjectLock = () => {
  pendingProtectedAction = null;
  projectLock.close();
};

changePasswordButton.addEventListener('click', () => setPasswordMode(!isChangingPassword));

document.querySelectorAll('.password-eye').forEach((button) => {
  button.addEventListener('click', () => {
    const input = button.previousElementSibling;
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    button.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    button.querySelector('i').className = `fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash'}`;
    input.focus();
  });
});

document.querySelector('.project-lock-close').addEventListener('click', closeProjectLock);
document.querySelector('.project-lock-cancel').addEventListener('click', closeProjectLock);
projectLock.addEventListener('click', (event) => {
  if (event.target === projectLock) closeProjectLock();
});

renderProjects();
