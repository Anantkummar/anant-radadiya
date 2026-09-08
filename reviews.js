import { watchReviews, publishReview, errorMessage } from './shared-data.js';
const reviewForm = document.querySelector('#review-form');
const reviewList = document.querySelector('#review-list');
const reviewMessage = reviewForm.querySelector('textarea[name="message"]');
const reviewStatus = document.querySelector('.review-form-status');

let customerReviews = [];
let submittingReview = false;
let pendingReviewId = null;
let pendingReviewContent = null;
const syncStatus = document.createElement('p');
syncStatus.setAttribute('role', 'status');
reviewList.before(syncStatus);

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
    scores.innerHTML = `<span>Work <b>${review.workRating}.0</b></span><span>Website <b>${review.websiteRating}.0</b></span>`;
    const date = document.createElement('time');
    date.textContent = review.date;
    scores.append(date);
    card.append(top, message, scores);
    reviewList.append(card);
  });
};

reviewMessage.addEventListener('input', () => {
  document.querySelector('#review-characters').textContent = String(reviewMessage.value.length);
});

reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submittingReview) return;
  const formData = new FormData(reviewForm);
  const review = {
    name: formData.get('customerName').trim(),
    service: formData.get('service'),
    workRating: Number(formData.get('workRating')),
    websiteRating: Number(formData.get('websiteRating')),
    message: formData.get('message').trim(),
    date: new Intl.DateTimeFormat('en', { month:'short', year:'numeric' }).format(new Date())
  };
  if (!review.name || review.name.length > 100 || !review.message || review.message.length > 500
      || ![1, 2, 3, 4, 5].includes(review.workRating) || ![1, 2, 3, 4, 5].includes(review.websiteRating)) {
    reviewStatus.textContent = 'Enter your name, feedback, and both star ratings.';
    return;
  }
  const content = JSON.stringify(review);
  if (pendingReviewContent !== content) {
    pendingReviewContent = content;
    pendingReviewId = crypto.randomUUID();
  }
  submittingReview = true;
  const submit = reviewForm.querySelector('[type="submit"]');
  submit.disabled = true;
  reviewStatus.textContent = 'Publishing your review…';
  try {
    await publishReview(review, pendingReviewId);
    reviewForm.reset();
    pendingReviewId = null;
    pendingReviewContent = null;
    document.querySelector('#review-characters').textContent = '0';
    reviewStatus.textContent = 'Thank you! Your review is now live.';
  } catch (error) {
    reviewStatus.textContent = `Review was not published. ${errorMessage(error)}`;
  } finally {
    submittingReview = false;
    submit.disabled = false;
  }
});

syncStatus.textContent = 'Loading reviews…';
watchReviews(reviews => {
  customerReviews = reviews;
  syncStatus.textContent = '';
  renderReviews();
}, error => {
  syncStatus.textContent = `Reviews could not sync. ${errorMessage(error)}`;
});

// Old reviews remain on the original device until its visitor publishes them.
try {
  const oldReviews = JSON.parse(localStorage.getItem('anantkumar_customer_reviews'));
  if (Array.isArray(oldReviews) && oldReviews.length) {
    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'save-project';
    importButton.textContent = 'Publish reviews saved on this device';
    reviewForm.after(importButton);
    importButton.addEventListener('click', async () => {
      importButton.disabled = true;
      try {
        for (const old of oldReviews) {
          const review = { name: old.name, service: old.service, workRating: old.workRating,
            websiteRating: old.websiteRating, message: old.message, date: old.date };
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(review)));
          const id = 'legacy-' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
          await publishReview(review, id);
        }
        localStorage.removeItem('anantkumar_customer_reviews');
        importButton.remove();
        reviewStatus.textContent = 'Your saved reviews are now shared across devices.';
      } catch (error) {
        reviewStatus.textContent = errorMessage(error);
        importButton.disabled = false;
      }
    });
  }
} catch { /* Storage may be unavailable; shared reviews still work. */ }
