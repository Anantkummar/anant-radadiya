import { watchProjects, saveProjects, signIn, signOut, getAccountProfile, changeUsername, changePassword, errorMessage } from './shared-data.js';
import { defaultPortfolioProjects } from './project-defaults.js';
const projectEditor = document.querySelector('#project-editor');
const projectForm = document.querySelector('#project-form');
const editorTitle = document.querySelector('#editor-title');
const deleteProjectButton = document.querySelector('.delete-project');
const editorStatus = document.createElement('p');
editorStatus.setAttribute('role', 'alert');
projectForm.append(editorStatus);
const login = document.querySelector('#login-form');
const loginSection = document.querySelector('#login-section');
const dashboard = document.querySelector('#dashboard');
const status = document.querySelector('#project-status');
const add = document.querySelector('#add-project');
let portfolioProjects = [], editorProjects = [];
let projectRevision = 0, editorRevision = 0;
let savingProject = false, unsubscribe, signedIn = false, projectsReady = false;
const accountDialog = document.querySelector('#account-dialog');
const usernameForm = document.querySelector('#username-form');
const passwordForm = document.querySelector('#password-form');
let savingAccount = false;
document.querySelector('#account-settings').addEventListener('click', async () => {
  if (!signedIn) return;
  usernameForm.reset();
  passwordForm.reset();
  accountDialog.querySelectorAll('[role="status"]').forEach(node => { node.textContent = ''; });
  accountDialog.showModal();
  try {
    const profile = await getAccountProfile();
    usernameForm.elements.username.value = profile?.username || '';
  } catch (error) {
    document.querySelector('#account-status').textContent = errorMessage(error);
  }
});
document.querySelector('#close-account').addEventListener('click', () => {
  if (!savingAccount) accountDialog.close();
});
accountDialog.addEventListener('cancel', event => {
  if (savingAccount) event.preventDefault();
});
accountDialog.addEventListener('close', () => {
  usernameForm.reset();
  passwordForm.reset();
});
async function saveAccount(form, update) {
  if (savingAccount) return;
  savingAccount = true;
  const buttons = [...accountDialog.querySelectorAll('button')];
  buttons.forEach(button => { button.disabled = true; });
  const message = form.querySelector('[role="status"]');
  message.textContent = 'Saving...';
  try {
    message.textContent = await update();
    form.reset();
  } catch (error) {
    message.textContent = errorMessage(error);
  } finally {
    savingAccount = false;
    buttons.forEach(button => { button.disabled = false; });
  }
}
usernameForm.addEventListener('submit', event => {
  event.preventDefault();
  void saveAccount(usernameForm, async () => {
    const username = await changeUsername(usernameForm.elements.username.value, usernameForm.elements.currentPassword.value);
    return `Username changed to ${username}.`;
  });
});
passwordForm.addEventListener('submit', event => {
  event.preventDefault();
  if (passwordForm.elements.newPassword.value !== passwordForm.elements.confirmPassword.value) {
    passwordForm.querySelector('[role="status"]').textContent = 'New passwords do not match.';
    return;
  }
  void saveAccount(passwordForm, async () => {
    await changePassword(passwordForm.elements.newPassword.value, passwordForm.elements.currentPassword.value);
    return 'Password changed successfully.';
  });
});

function render() {
  document.querySelector('#project-total').textContent = portfolioProjects.length;
  document.querySelector('#demo-total').textContent = portfolioProjects.filter(project => project.liveDemo).length;
  document.querySelector('#technology-total').textContent = new Set(portfolioProjects.flatMap(project => project.technologies || [])).size;
  const query = document.querySelector('#project-search').value.trim().toLowerCase();
  const category = document.querySelector('#category-filter').value;
  const list = document.querySelector('#admin-projects');
  list.replaceChildren();
  if (!portfolioProjects.length) list.textContent = 'No projects published.';
  portfolioProjects.forEach((project, index) => {
    if (category !== 'all' && project.category !== category) return;
    if (query && ![project.title, project.label, ...(project.technologies || [])].join(' ').toLowerCase().includes(query)) return;
    const row = document.createElement('article');
    row.className = 'project-row';
    const visual = document.createElement(project.image ? 'img' : 'span');
    if (project.image) { visual.src = project.image; visual.alt = project.title; }
    else { visual.className = 'project-placeholder'; visual.textContent = project.icon || '+'; }
    const details = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = project.title;
    const label = document.createElement('p');
    label.textContent = project.label;
    details.append(title, label);
    const tags = document.createElement('div');
    tags.className = 'project-tags';
    for (const technology of (project.technologies || []).slice(0, 4)) {
      const tag = document.createElement('span');
      tag.textContent = technology;
      tags.append(tag);
    }
    details.append(tags);
    const edit = document.createElement('button');
    edit.className = 'secondary';
    edit.innerHTML = '<i class="fa-solid fa-pen"></i>';
    edit.title = 'Edit ' + project.title;
    edit.setAttribute('aria-label', edit.title);
    edit.disabled = !projectsReady;
    edit.addEventListener('click', () => openProjectEditor(index));
    row.append(visual, details, edit);
    list.append(row);
  });
  if (portfolioProjects.length && !list.children.length) list.textContent = 'No projects match your search.';
}
document.querySelector('#project-search').addEventListener('input', render);
document.querySelector('#category-filter').addEventListener('change', render);
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
  projectForm.querySelector('.editor-grid').scrollTop = 0;
  window.setTimeout(() => {
    (focusLiveDemo ? projectForm.elements.liveDemo : projectForm.elements.title).focus();
  }, 50);
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
    status.textContent = 'Published successfully.';
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
  const value = projectForm.elements.projectIndex.value;
  if (value === '' || !editorProjects[Number(value)] || savingProject) return;
  if (!window.confirm('Delete this project from the website on all devices?')) return;
  const next = [...editorProjects];
  next.splice(Number(value), 1);
  void commitProjects(next);
});
for (const button of projectEditor.querySelectorAll('.editor-close, .cancel-editor')) {
  button.addEventListener('click', () => {
    if (!savingProject) projectEditor.close();
  });
}
projectEditor.addEventListener('close', () => {
  projectForm.reset();
  editorStatus.textContent = '';
});
projectEditor.addEventListener('cancel', event => {
  if (savingProject) event.preventDefault();
});
add.addEventListener('click', () => {
  if (signedIn && projectsReady) openProjectEditor();
});
login.addEventListener('submit', async event => {
  event.preventDefault();
  const button = login.querySelector('button');
  const message = document.querySelector('#login-status');
  button.disabled = true;
  message.textContent = 'Signing in...';
  try {
    await signIn(login.elements.username.value.trim(), login.elements.password.value);
    signedIn = true;
    login.reset();
    loginSection.hidden = true;
    dashboard.hidden = false;
    status.textContent = 'Loading projects...';
    unsubscribe = await watchProjects(data => {
      if (!signedIn) return;
      portfolioProjects = data.items === null ? defaultPortfolioProjects : data.items;
      projectRevision = data.revision;
      projectsReady = true;
      add.disabled = portfolioProjects.length >= 100;
      status.textContent = 'Projects are up to date.';
      render();
    }, error => {
      projectsReady = false;
      add.disabled = true;
      status.textContent = errorMessage(error);
      render();
    });
  } catch (error) {
    message.textContent = errorMessage(error);
  } finally {
    button.disabled = false;
  }
});
document.querySelector('#sign-out').addEventListener('click', async () => {
  try {
    await signOut();
    signedIn = false;
    unsubscribe?.();
    projectsReady = false;
    add.disabled = true;
    projectEditor.close();
    dashboard.hidden = true;
    loginSection.hidden = false;
    document.querySelector('#admin-projects').replaceChildren();
    document.querySelector('#login-status').textContent = '';
    login.elements.username.focus();
  } catch (error) { status.textContent = errorMessage(error); }
});
