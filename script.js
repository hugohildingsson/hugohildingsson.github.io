// Enkel klient-sidig auth (INTE SÄKERT) — kod: "uf202609"
const ACCESS_CODE = 'uf202609';

const overlay = document.getElementById('auth-overlay');
const input = document.getElementById('auth-input');
const submit = document.getElementById('auth-submit');
const message = document.getElementById('auth-message');
const siteContent = document.getElementById('site-content');

// Om redan sparat i sessionStorage — visa sidan
if (sessionStorage.getItem('siteUnlocked') === '1') {
  unlockSite();
}

// Hantera submit
submit.addEventListener('click', tryUnlock);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

function tryUnlock() {
  const val = input.value.trim();
  if (!val) {
    message.textContent = 'Skriv in koden.';
    return;
  }
  if (val === ACCESS_CODE) {
    // Lås upp och spara i session så användaren slipper ange igen under samma flik
    sessionStorage.setItem('siteUnlocked', '1');
    unlockSite();
  } else {
    message.textContent = 'Fel kod — försök igen.';
    input.value = '';
    input.focus();
  }
}

function unlockSite() {
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden','true');
  siteContent.classList.remove('site-hidden');
  siteContent.setAttribute('aria-hidden','false');
  // Sätt fokus till sidan
  document.querySelector('.site-header h1')?.focus();
}

/* --- Rest: video upload + lägga till kort (samma som tidigare) --- */

// Koppla fil-inputs som redan finns på sidan
document.querySelectorAll('.video-input').forEach(inputEl => attachInput(inputEl));

function attachInput(inputEl){
  inputEl.addEventListener('change', (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const card = inputEl.closest('.card');
    const video = card.querySelector('.video-player');
    const url = URL.createObjectURL(file);
    while (video.firstChild) video.removeChild(video.firstChild);
    const src = document.createElement('source');
    src.src = url;
    src.type = file.type || 'video/mp4';
    video.appendChild(src);
    video.load();
    video.play().catch(()=>{ /* autoplay kan blockeras */ });
  });
}

document.getElementById('add-card').addEventListener('click', addCard);

function addCard(){
  const cards = document.getElementById('cards');
  const index = cards.children.length + 1;
  const template = document.createElement('article');
  template.className = 'card';
  template.innerHTML = `
    <div class="card-header">
      <input class="card-title" value="Video ${index} — Rubrik" aria-label="Titel för kort ${index}" />
      <label class="upload-label">
        <input type="file" accept="video/*" class="video-input" />
        Ladda upp video
      </label>
    </div>
    <div class="video-wrap">
      <video controls preload="metadata" class="video-player" aria-label="Video ${index}">
        Din webbläsare stödjer inte videoelementet.
      </video>
    </div>
  `;
  cards.appendChild(template);
  const newInput = template.querySelector('.video-input');
  attachInput(newInput);
}
