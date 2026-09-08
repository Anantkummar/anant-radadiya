import { watchProjects, saveProjects, signIn, changePassword, errorMessage } from './shared-data.js';

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
const projectLock = document.querySelector('#project-lock');
const projectLockForm = document.querySelector('#project-lock-form');
const projectLockPassword = document.querySelector('#project-lock-password');
const projectLockError = document.querySelector('#project-lock-error');
const newPasswordInput = document.querySelector('#project-new-password');
const confirmPasswordInput = document.querySelector('#project-confirm-password');
const changePasswordFields = document.querySelector('#change-password-fields');
const changePasswordButton = document.querySelector('.change-password-toggle');
const unlockSubmitButton = document.querySelector('.project-unlock-submit');
let pendingProtectedAction = null;
let isChangingPassword = false;
let projectsReady = false;
let projectRevision = 0;
let editorRevision = 0;
let editorProjects = [];
let savingProject = false;
const projectStatus = document.createElement('p');
projectStatus.setAttribute('role', 'status');
projectList.before(projectStatus);
const editorStatus = document.createElement('p');
editorStatus.setAttribute('role', 'alert');
projectForm.append(editorStatus);

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
  if (!projectsReady) return;
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

const openProjectEditor = (index = null, focusLiveDemo = false) => {
  editorRevision = projectRevision;
  editorProjects = [...portfolioProjects];
  editorStatus.textContent = '';
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

async function commitProjects(items) {
  if (savingProject) return;
  savingProject = true;
  const buttons = [...projectForm.querySelectorAll('button')];
  buttons.forEach(button => { button.disabled = true; });
  editorStatus.textContent = 'Saving changes…';
  try {
    await saveProjects(items, editorRevision);
    projectEditor.close();
  } catch (error) {
    editorStatus.textContent = errorMessage(error);
  } finally {
    savingProject = false;
    buttons.forEach(button => { button.disabled = false; });
  }
}

projectForm.addEventListener('submit', async (event) => {
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
  const next = [...editorProjects];
  if (indexValue === '') next.push(project);
  else next[Number(indexValue)] = project;
  await commitProjects(next);
});

deleteProjectButton.addEventListener('click', () => {
  requestProjectUnlock(() => {
    const index = Number(projectForm.elements.projectIndex.value);
    if (!Number.isInteger(index) || projectForm.elements.projectIndex.value === '' || !editorProjects[index]) return;
    const next = [...editorProjects];
    next.splice(index, 1);
    void commitProjects(next);
  });
});

document.querySelector('.editor-close').addEventListener('click', () => projectEditor.close());
document.querySelector('.cancel-editor').addEventListener('click', () => projectEditor.close());
projectEditor.addEventListener('click', (event) => {
  if (event.target === projectEditor) projectEditor.close();
});
projectEditor.addEventListener('cancel', event => {
  if (savingProject) event.preventDefault();
});

projectLockForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (unlockSubmitButton.disabled) return;
  unlockSubmitButton.disabled = true;
  projectLockError.textContent = 'Signing in…';
  try {
    await signIn(document.querySelector('#project-admin-email').value.trim(), projectLockPassword.value);
    if (isChangingPassword) {
      const newPassword = newPasswordInput.value;
      if (newPassword.length < 6) {
        projectLockError.textContent = 'Use at least 6 characters.';
        newPasswordInput.select();
        return;
      }
      if (newPassword !== confirmPasswordInput.value) {
        projectLockError.textContent = 'New passwords do not match.';
        confirmPasswordInput.select();
        return;
      }
      await changePassword(newPassword);
      projectLockForm.reset();
      setPasswordMode(false);
      projectLockError.textContent = 'Password changed successfully.';
      return;
    }
    const action = pendingProtectedAction;
    pendingProtectedAction = null;
    projectLock.close();
    if (action) action();
  } catch (error) {
    projectLockError.textContent = errorMessage(error);
  } finally {
    unlockSubmitButton.disabled = false;
  }
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

try {
  const saved = JSON.parse(localStorage.getItem('anantkumar_portfolio_projects'));
  if (Array.isArray(saved)) {
    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'save-project';
    importButton.textContent = 'Use this device’s saved projects on all devices';
    projectList.before(importButton);
    importButton.addEventListener('click', () => requestProjectUnlock(async () => {
      importButton.disabled = true;
      try {
        await saveProjects(saved, projectRevision);
        localStorage.removeItem('anantkumar_portfolio_projects');
        importButton.remove();
      } catch (error) {
        projectStatus.textContent = errorMessage(error);
        importButton.disabled = false;
      }
    }));
  }
} catch { /* Shared storage works even when browser storage is unavailable. */ }

projectStatus.textContent = 'Loading projects…';
watchProjects(data => {
  portfolioProjects = data.items === null ? defaultPortfolioProjects : data.items;
  projectRevision = data.revision;
  projectsReady = true;
  projectStatus.textContent = '';
  renderProjects();
}, error => {
  projectsReady = false;
  projectStatus.textContent = `Projects could not sync. ${errorMessage(error)}`;
});
