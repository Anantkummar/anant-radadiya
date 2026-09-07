(() => {
  const value = document.querySelector('#visit-count');
  if (!value) return;
  const counter = value.closest('.visit-counter');
  const visitId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  let registered = false;
  let pending = false;
  let lastCount = null;
  let timer;

  async function update() {
    if (pending) return;
    clearTimeout(timer);
    if (document.hidden) return;
    pending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    counter.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/visits', {
        method: registered ? 'GET' : 'POST',
        headers: registered ? {} : { 'X-Visit-ID': visitId },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Counter unavailable');
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Invalid count');
      registered = true;
      lastCount = data.count;
      value.textContent = String(lastCount).padStart(4, '0');
      counter.dataset.state = 'live';
      counter.title = 'Total website visits across all devices';
      counter.classList.add('count-updated');
    } catch {
      counter.dataset.state = 'offline';
      value.textContent = lastCount === null ? '--' : String(lastCount).padStart(4, '0');
      counter.title = lastCount === null ? 'Visit counter reconnecting' : 'Last recorded total; reconnecting';
    } finally {
      clearTimeout(timeout);
      pending = false;
      counter.setAttribute('aria-busy', 'false');
      timer = setTimeout(update, counter.dataset.state === 'live' ? 15000 : 5000);
    }
  }

  document.addEventListener('visibilitychange', update);
  window.addEventListener('online', update);
  update();
})();
