const ACCESS_CODE = 'uf202609';
const STORAGE_KEY = 'crmData';
const overlay = document.getElementById('auth-overlay');
const authInput = document.getElementById('auth-input');
const authSubmit = document.getElementById('auth-submit');
const authMessage = document.getElementById('auth-message');
const siteContent = document.getElementById('site-content');

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"customers":[],"contacts":[]}');
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function unlockSite() {
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  siteContent.classList.remove('site-hidden');
  siteContent.setAttribute('aria-hidden', 'false');
  render();
}
function tryUnlock() {
  if (authInput.value.trim() === ACCESS_CODE) {
    sessionStorage.setItem('siteUnlocked', '1');
    unlockSite();
  } else {
    authMessage.textContent = 'Fel kod — försök igen.';
    authInput.value = '';
    authInput.focus();
  }
}
authSubmit.addEventListener('click', tryUnlock);
authInput.addEventListener('keydown', event => { if (event.key === 'Enter') tryUnlock(); });
if (sessionStorage.getItem('siteUnlocked') === '1') unlockSite();

function render() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  document.getElementById('customer-count').textContent = data.customers.length;
  document.getElementById('contact-count').textContent = data.contacts.length;
  const customerSelect = document.getElementById('contact-customer');
  const selected = customerSelect.value;
  customerSelect.innerHTML = '<option value="">Välj kund</option>' + data.customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  customerSelect.value = selected;

  const customers = data.customers.filter(c => `${c.name} ${c.org} ${c.email}`.toLowerCase().includes(query));
  document.getElementById('customer-list').innerHTML = customers.length ? customers.map(c => `
    <article class="record"><div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.org || 'Organisationsnummer saknas')} · ${escapeHtml(c.email || 'Ingen e-post')} · ${escapeHtml(c.phone || 'Inget telefonnummer')}</p></div><button class="delete-button" data-delete-customer="${c.id}">Ta bort</button></article>`).join('') : '<p class="empty-state">Inga kunder ännu.</p>';
  const contacts = data.contacts.filter(c => `${c.name} ${c.email} ${c.role} ${customerName(c.customerId)}`.toLowerCase().includes(query));
  document.getElementById('contact-list').innerHTML = contacts.length ? contacts.map(c => `
    <article class="record"><div><h3>${escapeHtml(c.name)} <span>${escapeHtml(c.role || '')}</span></h3><p>${escapeHtml(customerName(c.customerId))} · ${escapeHtml(c.email || 'Ingen e-post')} · ${escapeHtml(c.phone || 'Inget telefonnummer')}</p></div><button class="delete-button" data-delete-contact="${c.id}">Ta bort</button></article>`).join('') : '<p class="empty-state">Inga kontaktpersoner ännu.</p>';
}
function customerName(customerId) { return data.customers.find(c => c.id === customerId)?.name || 'Okänd kund'; }

document.getElementById('customer-form').addEventListener('submit', event => {
  event.preventDefault();
  data.customers.push({ id: id(), name: document.getElementById('customer-name').value.trim(), org: document.getElementById('customer-org').value.trim(), email: document.getElementById('customer-email').value.trim(), phone: document.getElementById('customer-phone').value.trim() });
  save(); event.target.reset(); render();
});
document.getElementById('contact-form').addEventListener('submit', event => {
  event.preventDefault();
  data.contacts.push({ id: id(), name: document.getElementById('contact-name').value.trim(), customerId: document.getElementById('contact-customer').value, email: document.getElementById('contact-email').value.trim(), phone: document.getElementById('contact-phone').value.trim(), role: document.getElementById('contact-role').value.trim() });
  save(); event.target.reset(); render();
});
document.getElementById('search-input').addEventListener('input', render);
document.addEventListener('click', event => {
  const customerId = event.target.dataset.deleteCustomer;
  const contactId = event.target.dataset.deleteContact;
  if (customerId && confirm('Ta bort kunden och dess kontaktpersoner?')) { data.customers = data.customers.filter(c => c.id !== customerId); data.contacts = data.contacts.filter(c => c.customerId !== customerId); save(); render(); }
  if (contactId && confirm('Ta bort kontaktpersonen?')) { data.contacts = data.contacts.filter(c => c.id !== contactId); save(); render(); }
});

document.getElementById('bg-input').addEventListener('change', event => { const file = event.target.files[0]; if (file) document.body.style.backgroundImage = `url(${URL.createObjectURL(file)})`; });
document.getElementById('clear-bg').addEventListener('click', () => { document.body.style.backgroundImage = ''; });
