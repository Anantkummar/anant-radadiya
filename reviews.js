const reviewStorageKey = 'anantkumar_customer_reviews';
const reviewForm = document.querySelector('#review-form');
const reviewList = document.querySelector('#review-list');
const reviewMessage = reviewForm.querySelector('textarea[name="message"]');
const reviewStatus = document.querySelector('.review-form-status');

const loadReviews = () => {
  try {
    const savedReviews = JSON.parse(localStorage.getItem(reviewStorageKey));
    return Array.isArray(savedReviews) ? savedReviews : [];
  } catch {
    return [];
  }
};

let customerReviews = loadReviews();

const createStars = (rating) => {
  const stars = document.createElement('div');
  stars.className = 'review-stars';
  stars.setAttribute('aria-label', `${rating} out of 5 stars`);
  for (let index = 1; index <= 5; index += 1) {
    const star = document.createElement('i');
    star.className = index <= rating ? 'fa-solid fa-star' : 'fa-regular fa-star';
    stars.append(star);
  }
  return stars;
};

const updateReviewSummary = () => {
  const count = customerReviews.length;
  const workAverage = count ? customerReviews.reduce((sum, review) => sum + review.workRating, 0) / count : 0;
  const websiteAverage = count ? customerReviews.reduce((sum, review) => sum + review.websiteRating, 0) / count : 0;
  const overallAverage = (workAverage + websiteAverage) / 2;
  document.querySelector('#average-rating').textContent = overallAverage.toFixed(1);
  document.querySelector('#work-average').textContent = `${workAverage.toFixed(1)} / 5`;
  document.querySelector('#website-average').textContent = `${websiteAverage.toFixed(1)} / 5`;
  document.querySelector('#review-count').textContent = String(count);
  document.querySelector('#review-badge').textContent = count ? `${count} ${count === 1 ? 'review' : 'reviews'}` : 'Be the first';

  document.querySelectorAll('.average-stars i').forEach((star, index) => {
    star.className = index < Math.round(overallAverage) ? 'fa-solid fa-star' : 'fa-regular fa-star';
  });
};

const renderReviews = () => {
  reviewList.replaceChildren();
  updateReviewSummary();

  if (!customerReviews.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'review-empty';
    emptyState.innerHTML = '<span><i class="fa-regular fa-message"></i></span><h4>No reviews yet</h4><p>Your feedback could be the first one on this wall.</p>';
    reviewList.append(emptyState);
    return;
  }

  [...customerReviews].reverse().forEach((review) => {
    const card = document.createElement('article');
    card.className = 'customer-review';
    const top = document.createElement('div');
    top.className = 'customer-review-top';
    const identity = document.createElement('div');
    identity.className = 'review-identity';
    const avatar = document.createElement('span');
    avatar.textContent = review.name.charAt(0).toUpperCase();
    const person = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = review.name;
    const service = document.createElement('small');
    service.textContent = review.service;
    person.append(name, service);
    identity.append(avatar, person);
    top.append(identity, createStars(Math.round((review.workRating + review.websiteRating) / 2)));
    const message = document.createElement('p');
    message.textContent = `“${review.message}”`;
    const scores = document.createElement('div');
    scores.className = 'review-scores';
    scores.innerHTML = `<span>Work <b>${review.workRating}.0</b></span><span>Website <b>${review.websiteRating}.0</b></span><time>${review.date}</time>`;
    card.append(top, message, scores);
    reviewList.append(card);
  });
};

reviewMessage.addEventListener('input', () => {
  document.querySelector('#review-characters').textContent = String(reviewMessage.value.length);
});

reviewForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(reviewForm);
  customerReviews.push({
    name: formData.get('customerName').trim(),
    service: formData.get('service'),
    workRating: Number(formData.get('workRating')),
    websiteRating: Number(formData.get('websiteRating')),
    message: formData.get('message').trim(),
    date: new Intl.DateTimeFormat('en', { month:'short', year:'numeric' }).format(new Date())
  });
  localStorage.setItem(reviewStorageKey, JSON.stringify(customerReviews));
  reviewForm.reset();
  document.querySelector('#review-characters').textContent = '0';
  reviewStatus.textContent = 'Thank you! Your review is now live.';
  renderReviews();
  window.setTimeout(() => { reviewStatus.textContent = ''; }, 4000);
});

renderReviews();
