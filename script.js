const revealTargets = document.querySelectorAll('.hero h1, .section-title, .profile-card, .about-content, .stats-bar, .skill-grid article, .detail-card, .project-card-grid > article, .three-card-grid article, .language-grid article, .achievement-grid article, .four-card-grid article, .service-grid article, .review-overview, .review-form-panel, .review-display, .contact-section h2, .email-link');

const visitCount = document.querySelector('#visit-count');
if (visitCount) {
  const storageKey = 'anantkumar_portfolio_page_visits_v3';
  let currentCount = 0n;
  try {
    const savedCount = localStorage.getItem(storageKey);
    if (savedCount !== null && /^\d+$/.test(savedCount)) currentCount = BigInt(savedCount) + 1n;
  } catch {
    currentCount = 0n;
  }
  localStorage.setItem(storageKey, currentCount.toString());
  visitCount.textContent = currentCount.toString().padStart(4, '0');
  visitCount.closest('.visit-counter').classList.add('count-updated');
}

const navToggle = document.querySelector('.nav-toggle');
const primaryNavigation = document.querySelector('#primary-navigation');
const closeMobileNavigation = () => {
  if (!navToggle || !primaryNavigation) return;
  navToggle.classList.remove('is-open');
  primaryNavigation.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation');
};

if (navToggle && primaryNavigation) {
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.classList.toggle('is-open', !isOpen);
    primaryNavigation.classList.toggle('is-open', !isOpen);
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  });
  primaryNavigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileNavigation));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileNavigation();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeMobileNavigation();
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealTargets.forEach((target) => {
  target.classList.add('reveal');
  observer.observe(target);
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  if (link.classList.contains('explore-portal')) return;
  link.addEventListener('click', (event) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    event.preventDefault();
    document.querySelectorAll('.nav-links a').forEach((navLink) => navLink.classList.remove('active'));
    if (link.closest('.nav-links')) link.classList.add('active');
    section.scrollIntoView({ behavior: 'smooth' });
  });
});

document.querySelectorAll('.filter-pills').forEach((group) => {
  group.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      group.querySelectorAll('button').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
      if (group.classList.contains('skill-filters')) {
        let visibleIndex = 0;
        document.querySelectorAll('.skill-grid article').forEach((card) => {
          const isMatch = card.dataset.category === button.dataset.category;
          card.hidden = !isMatch;
          if (isMatch) {
            card.classList.remove('skill-card-enter');
            card.style.setProperty('--enter-delay', `${visibleIndex * 420}ms`);
            visibleIndex += 1;
            requestAnimationFrame(() => card.classList.add('skill-card-enter'));
          }
        });
      } else if (group.classList.contains('project-filters')) {
        const selectedCategory = button.dataset.category;
        document.querySelectorAll('.project-card').forEach((card) => {
          const isMatch = selectedCategory === 'all' || card.dataset.category === selectedCategory;
          card.hidden = !isMatch;
          if (isMatch) {
            card.classList.remove('project-card-enter');
            requestAnimationFrame(() => card.classList.add('project-card-enter'));
          }
        });
      }
    });
  });
});

const explorePortal = document.querySelector('.explore-portal');
if (explorePortal) {
  explorePortal.addEventListener('click', (event) => {
    event.preventDefault();
    if (explorePortal.classList.contains('is-launching')) return;
    const destination = document.querySelector('#work');
    const label = explorePortal.querySelector('.portal-core small');
    explorePortal.classList.add('is-launching');
    label.textContent = 'Opening';
    window.setTimeout(() => {
      destination.scrollIntoView({ behavior:'smooth', block:'start' });
      destination.classList.add('portal-arrival');
      window.setTimeout(() => destination.classList.remove('portal-arrival'), 1100);
    }, 520);
    window.setTimeout(() => {
      explorePortal.classList.remove('is-launching');
      label.textContent = 'Explore';
    }, 1500);
  });
}

const skillFilters = document.querySelector('.skill-filters');
let skillTabTimer;
const startSkillTabRotation = () => {
  window.clearTimeout(skillTabTimer);
  const visibleSkills = document.querySelectorAll('.skill-grid article:not([hidden])').length;
  const sequenceDuration = (visibleSkills * 420) + 1100;
  skillTabTimer = window.setTimeout(() => {
    const buttons = [...skillFilters.querySelectorAll('button')];
    const activeIndex = buttons.findIndex((button) => button.classList.contains('active'));
    buttons[(activeIndex + 1) % buttons.length].click();
  }, sequenceDuration);
};

if (skillFilters) {
  skillFilters.addEventListener('click', startSkillTabRotation);
  skillFilters.querySelector('.active').click();
}

document.querySelectorAll('.skill-grid article').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - bounds.top}px`);
  });
});

const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  const options = contactForm.querySelector('.inquiry-options');
  const status = contactForm.querySelector('.form-status');
  const nameInput = contactForm.querySelector('[name="name"]');
  const mobileInput = contactForm.querySelector('[name="mobile"]');

  nameInput.addEventListener('input', () => {
    const hasTrailingSpace = /\s$/.test(nameInput.value);
    let lettersLeft = 20;
    const words = nameInput.value.replace(/[^A-Za-z\s]/g, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => {
      const shortened = word.slice(0, lettersLeft);
      lettersLeft -= shortened.length;
      return shortened;
    }).filter(Boolean);
    nameInput.value = words.join(' ') + (hasTrailingSpace && words.length < 2 ? ' ' : '');
  });

  mobileInput.addEventListener('input', () => {
    mobileInput.value = mobileInput.value.replace(/\D/g, '').slice(0, 10);
  });

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const subject = `Portfolio inquiry: ${data.get('service')}`;
    const body = `Hi Anantkumar,\n\n${data.get('message')}\n\nName: ${data.get('name')}\nMobile: ${data.get('mobile')}\nService: ${data.get('service')}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=anantixtech@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const whatsappText = `${subject}\n\n${body}`;
    contactForm.querySelector('.inquiry-gmail').href = gmailUrl;
    contactForm.querySelector('.inquiry-whatsapp').href = `https://wa.me/918866908855?text=${encodeURIComponent(whatsappText)}`;
    status.textContent = 'Your inquiry is ready—choose a contact option below.';
    options.hidden = false;
    options.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  contactForm.querySelector('.close-options').addEventListener('click', () => {
    options.hidden = true;
    status.textContent = '';
  });
}

const experienceYears = document.querySelector('#experience-years');
if (experienceYears) {
  const startYear = Number(experienceYears.dataset.startYear);
  const years = Math.max(0, new Date().getFullYear() - startYear);
  experienceYears.textContent = `${years}+`;
  experienceYears.setAttribute('aria-label', `${years} plus years of experience`);
}
