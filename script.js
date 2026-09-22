const ACCESS_CODE = '123';
const STORAGE_KEY = 'crmData';
const overlay = document.getElementById('auth-overlay');
const authInput = document.getElementById('auth-input');
const authSubmit = document.getElementById('auth-submit');
const authMessage = document.getElementById('auth-message');
const siteContent = document.getElementById('site-content');

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"customers":[],"contacts":[]}');
if (!Array.isArray(data.customers)) data.customers = [];
if (!Array.isArray(data.contacts)) data.contacts = [];

data.customers = data.customers.map(customer => ({
  id: customer.id || cryptoRandomId(),
  name: customer.name || '',
  org: customer.org || '',
  email: customer.email || '',
  phone: customer.phone || '',
  status: customer.status || 'lead',
  followUp: customer.followUp || '',
  value: Number(customer.value) || 0,
  notes: customer.notes || '',
  logo: customer.logo || '',
  qr: customer.qr || '',
  createdAt: customer.createdAt || new Date().toISOString()
}));

data.contacts = data.contacts.map(contact => ({
  id: contact.id || cryptoRandomId(),
  name: contact.name || '',
  customerId: contact.customerId || '',
  email: contact.email || '',
  phone: contact.phone || '',
  role: contact.role || ''
}));

let followFilter = 'all';
const saveData = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));
const cryptoRandomId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const statusNames = { lead: 'Lead', active: 'Aktiv', paused: 'Pausad', won: 'Kund' };
const customerNameById = (id) => data.customers.find(c => c.id === id)?.name || 'Okänd kund';

function unlockSite() {
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  siteContent.classList.remove('site-hidden');
  siteContent.setAttribute('aria-hidden', 'false');
  render();
}

function tryUnlock() {
  const value = authInput.value.trim();
  if (!value) {
    authMessage.textContent = 'Skriv in koden.';
    return;
  }

  if (value === ACCESS_CODE) {
    sessionStorage.setItem('siteUnlocked', '1');
    unlockSite();
  } else {
    authMessage.textContent = 'Fel kod — försök igen.';
    authInput.value = '';
    authInput.focus();
  }
}

authSubmit.addEventListener('click', tryUnlock);
authInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') tryUnlock();
});

if (sessionStorage.getItem('siteUnlocked') === '1') {
  unlockSite();
}

function setTab(tabName) {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => setTab(button.dataset.tab));
});

document.querySelectorAll('[data-tab-link]').forEach(button => {
  button.addEventListener('click', () => setTab(button.dataset.tabLink));
});

function statusBadge(status) {
  return `<span class="status status-${status}">${statusNames[status] || 'Aktiv'}</span>`;
}

function renderSummary() {
  const totalCustomers = data.customers.length;
  const totalContacts = data.contacts.length;
  const activeFollowUps = data.customers.filter(customer => customer.followUp).length;
  const totalValue = data.customers.reduce((sum, customer) => sum + (Number(customer.value) || 0), 0);

  document.getElementById('customer-count').textContent = totalCustomers;
  document.getElementById('contact-count').textContent = totalContacts;
  document.getElementById('followup-count').textContent = activeFollowUps;
  document.getElementById('value-count').textContent = `${totalValue.toLocaleString('sv-SE')} kr`;
}

function renderCustomerSelect() {
  const customerSelect = document.getElementById('contact-customer');
  if (!customerSelect) return;

  const selectedValue = customerSelect.value;
  customerSelect.innerHTML = '<option value="">Välj kund</option>' + data.customers.map(customer => {
    return `<option value="${escapeHtml(customer.id)}">${escapeHtml(customer.name)}</option>`;
  }).join('');

  if (selectedValue && data.customers.some(customer => customer.id === selectedValue)) {
    customerSelect.value = selectedValue;
  }
}

function renderCustomersList() {
  const search = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('status-filter')?.value || 'all';
  const customerList = document.getElementById('customer-list');

  const filtered = data.customers.filter(customer => {
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesSearch = `${customer.name} ${customer.org} ${customer.email} ${customer.phone} ${customer.notes}`
      .toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });

  if (!customerList) return;

  customerList.innerHTML = filtered.length
    ? filtered.map(customer => `
      <article class="record">
        <div class="record-main">
          ${customer.logo ? `<img class="record-logo" src="${escapeHtml(customer.logo)}" alt="Logotyp för ${escapeHtml(customer.name)}" />` : ''}
          ${customer.qr ? `<button class="qr-mini" data-qr-customer="${escapeHtml(customer.id)}" title="Visa QR-kod">QR</button>` : ''}
          <div>
            <h3>${escapeHtml(customer.name)} ${statusBadge(customer.status)}</h3>
            <p>${escapeHtml(customer.org || 'Org.nr saknas')} · ${escapeHtml(customer.email || 'Ingen e-post')} · ${escapeHtml(customer.phone || 'Inget telefonnummer')}</p>
            ${customer.notes ? `<p>${escapeHtml(customer.notes.slice(0, 90))}${customer.notes.length > 90 ? '…' : ''}</p>` : ''}
          </div>
        </div>
        <div class="record-actions">
          <button class="small-button" data-edit-customer="${escapeHtml(customer.id)}">Redigera</button>
          <button class="small-button delete-button" data-delete-customer="${escapeHtml(customer.id)}">Ta bort</button>
        </div>
      </article>
    `).join('')
    : '<p class="empty-state">Inga kunder matchar sökningen.</p>';
}

function renderContactsList() {
  const search = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const contactList = document.getElementById('contact-list');

  const filtered = data.contacts.filter(contact => {
    const haystack = `${contact.name} ${contact.email} ${contact.role} ${customerNameById(contact.customerId)}`.toLowerCase();
    return haystack.includes(search);
  });

  if (!contactList) return;

  contactList.innerHTML = filtered.length
    ? filtered.map(contact => `
      <article class="record">
        <div>
          <h3>${escapeHtml(contact.name)} ${contact.role ? `<span>${escapeHtml(contact.role)}</span>` : ''}</h3>
          <p>${escapeHtml(customerNameById(contact.customerId))} · ${escapeHtml(contact.email || 'Ingen e-post')} · ${escapeHtml(contact.phone || 'Inget telefonnummer')}</p>
        </div>
        <div class="record-actions">
          <button class="small-button" data-edit-contact="${escapeHtml(contact.id)}">Redigera</button>
          <button class="small-button delete-button" data-delete-contact="${escapeHtml(contact.id)}">Ta bort</button>
        </div>
      </article>
    `).join('')
    : '<p class="empty-state">Inga kontaktpersoner ännu.</p>';
}

function renderRecentCustomers() {
  const recent = [...data.customers].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4);
  const container = document.getElementById('recent-customers');
  if (!container) return;

  container.innerHTML = recent.length
    ? recent.map(customer => `
      <article class="record">
        <div class="record-main">
          ${customer.logo ? `<img class="record-logo" src="${escapeHtml(customer.logo)}" alt="Logotyp för ${escapeHtml(customer.name)}" />` : ''}
          ${customer.qr ? `<button class="qr-mini" data-qr-customer="${escapeHtml(customer.id)}" title="Visa QR-kod">QR</button>` : ''}
          <div>
            <h3>${escapeHtml(customer.name)} ${statusBadge(customer.status)}</h3>
            <p>${escapeHtml(customer.email || 'Ingen e-post')} · ${escapeHtml(customer.phone || 'Inget telefonnummer')}</p>
          </div>
        </div>
      </article>
    `).join('')
    : '<p class="empty-state">Lägg till din första kund.</p>';
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const target = new Date(`${dateString}T00:00:00`);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function renderUpcomingFollowUps() {
  const list = [...data.customers].filter(customer => customer.followUp).sort((a, b) => (a.followUp || '').localeCompare(b.followUp || '')).slice(0, 4);
  const container = document.getElementById('upcoming-followups');
  if (!container) return;

  container.innerHTML = list.length
    ? list.map(customer => {
        const diff = daysUntil(customer.followUp);
        const className = diff !== null && diff < 0 ? 'overdue' : '';
        return `
          <div class="followup-item ${className}">
            <div>
              <strong>${escapeHtml(customer.name)}</strong>
              <p class="date-note">${escapeHtml(customer.notes || 'Ingen anteckning')}</p>
            </div>
            <span class="followup-date">${new Date(`${customer.followUp}T00:00:00`).toLocaleDateString('sv-SE')}</span>
          </div>
        `;
      }).join('')
    : '<p class="empty-state">Inga uppföljningar planerade.</p>';
}

function renderFollowUpList() {
  const container = document.getElementById('followup-list');
  if (!container) return;

  let list = [...data.customers];

  if (followFilter === 'overdue') {
    list = list.filter(customer => customer.followUp && daysUntil(customer.followUp) < 0);
  } else if (followFilter === 'soon') {
    list = list.filter(customer => customer.followUp && daysUntil(customer.followUp) >= 0 && daysUntil(customer.followUp) <= 7);
  } else if (followFilter === 'none') {
    list = list.filter(customer => !customer.followUp);
  }

  list.sort((a, b) => (a.followUp || '9999-12-31').localeCompare(b.followUp || '9999-12-31'));

  container.innerHTML = list.length
    ? list.map(customer => {
        const diff = daysUntil(customer.followUp);
        const className = diff !== null && diff < 0 ? 'overdue' : diff !== null && diff <= 7 ? 'soon' : '';

        return `
          <div class="followup-item ${className}">
            <div class="record-main">
              ${customer.logo ? `<img class="record-logo" src="${escapeHtml(customer.logo)}" alt="Logotyp för ${escapeHtml(customer.name)}" />` : ''}
              ${customer.qr ? `<button class="qr-mini" data-qr-customer="${escapeHtml(customer.id)}" title="Visa QR-kod">QR</button>` : ''}
              <div>
                <h3>${escapeHtml(customer.name)} ${statusBadge(customer.status)}</h3>
                <p class="date-note">${escapeHtml(customer.notes || 'Ingen anteckning')}</p>
              </div>
            </div>
            <div>
              <div class="followup-date">${customer.followUp ? new Date(`${customer.followUp}T00:00:00`).toLocaleDateString('sv-SE') : 'Inget datum'}</div>
              <button class="small-button" data-edit-customer="${escapeHtml(customer.id)}">Redigera</button>
            </div>
          </div>
        `;
      }).join('')
    : '<p class="empty-state">Inga kunder i denna vy.</p>';
}

function render() {
  renderSummary();
  renderCustomerSelect();
  renderCustomersList();
  renderContactsList();
  renderRecentCustomers();
  renderUpcomingFollowUps();
  renderFollowUpList();
}

function openCustomerDialog(customer = null) {
  const dialog = document.getElementById('customer-dialog');
  const form = document.getElementById('customer-form');
  const title = document.getElementById('customer-dialog-title');
  const hiddenId = document.getElementById('edit-customer-id');

  form.reset();
  hiddenId.value = customer ? customer.id : '';
  title.textContent = customer ? 'Redigera kund' : 'Ny kund';

  if (customer) {
    document.getElementById('customer-name').value = customer.name || '';
    document.getElementById('customer-org').value = customer.org || '';
    document.getElementById('customer-email').value = customer.email || '';
    document.getElementById('customer-phone').value = customer.phone || '';
    document.getElementById('customer-status').value = customer.status || 'lead';
    document.getElementById('customer-followup').value = customer.followUp || '';
    document.getElementById('customer-value').value = customer.value || 0;
    document.getElementById('customer-notes').value = customer.notes || '';
  }

  dialog.showModal();
}

function openContactDialog(contact = null) {
  const dialog = document.getElementById('contact-dialog');
  const form = document.getElementById('contact-form');
  const title = document.getElementById('contact-dialog-title');
  const hiddenId = document.getElementById('edit-contact-id');

  form.reset();
  hiddenId.value = contact ? contact.id : '';
  title.textContent = contact ? 'Redigera kontaktperson' : 'Ny kontaktperson';

  if (contact) {
    document.getElementById('contact-name').value = contact.name || '';
    document.getElementById('contact-customer').value = contact.customerId || '';
    document.getElementById('contact-email').value = contact.email || '';
    document.getElementById('contact-phone').value = contact.phone || '';
    document.getElementById('contact-role').value = contact.role || '';
  }

  renderCustomerSelect();
  dialog.showModal();
}

function showQr(customerId) {
  const customer = data.customers.find(c => c.id === customerId);
  if (!customer || !customer.qr) return;

  const existing = document.getElementById('qr-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'qr-modal';
  modal.className = 'qr-modal';
  modal.innerHTML = `
    <div class="qr-modal-card">
      <button class="close-button" data-close-qr>×</button>
      <h3>${escapeHtml(customer.name)}</h3>
      <div class="qr-preview"><img src="${escapeHtml(customer.qr)}" alt="QR-kod för ${escapeHtml(customer.name)}" /></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('[data-close-qr]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.remove();
  });
}

document.querySelectorAll('[data-open-customer]').forEach(button => {
  button.addEventListener('click', () => openCustomerDialog());
});

document.querySelectorAll('[data-open-contact]').forEach(button => {
  button.addEventListener('click', () => openContactDialog());
});

document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => button.closest('dialog')?.close());
});

document.getElementById('search-input')?.addEventListener('input', render);
document.getElementById('status-filter')?.addEventListener('change', render);

document.querySelectorAll('[data-follow-filter]').forEach(button => {
  button.addEventListener('click', () => {
    followFilter = button.dataset.followFilter;
    document.querySelectorAll('[data-follow-filter]').forEach(el => el.classList.toggle('active', el === button));
    renderFollowUpList();
  });
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('customer-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const customerId = document.getElementById('edit-customer-id').value;
  const existingCustomer = data.customers.find(c => c.id === customerId);
  const qrFile = document.getElementById('customer-qr').files[0];

  const customer = {
    id: existingCustomer ? existingCustomer.id : cryptoRandomId(),
    name: document.getElementById('customer-name').value.trim(),
    org: document.getElementById('customer-org').value.trim(),
    email: document.getElementById('customer-email').value.trim(),
    phone: document.getElementById('customer-phone').value.trim(),
    status: document.getElementById('customer-status').value,
    followUp: document.getElementById('customer-followup').value,
    value: Number(document.getElementById('customer-value').value || 0),
    notes: document.getElementById('customer-notes').value.trim(),
    createdAt: existingCustomer ? existingCustomer.createdAt : new Date().toISOString(),
    logo: existingCustomer?.logo || '',
    qr: existingCustomer?.qr || ''
  };

  if (qrFile) {
    customer.qr = await fileToDataUrl(qrFile);
  }

  if (existingCustomer) {
    data.customers = data.customers.map(c => c.id === customerId ? customer : c);
  } else {
    data.customers.push(customer);
  }

  saveData();
  render();
  document.getElementById('customer-dialog').close();
});

document.getElementById('contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();

  const contactId = document.getElementById('edit-contact-id').value;
  const existingContact = data.contacts.find(c => c.id === contactId);

  const contact = {
    id: existingContact ? existingContact.id : cryptoRandomId(),
    name: document.getElementById('contact-name').value.trim(),
    customerId: document.getElementById('contact-customer').value,
    email: document.getElementById('contact-email').value.trim(),
    phone: document.getElementById('contact-phone').value.trim(),
    role: document.getElementById('contact-role').value.trim()
  };

  if (existingContact) {
    data.contacts = data.contacts.map(c => c.id === contactId ? contact : c);
  } else {
    data.contacts.push(contact);
  }

  saveData();
  render();
  document.getElementById('contact-dialog').close();
});

document.addEventListener('click', (event) => {
  const editCustomerButton = event.target.closest('[data-edit-customer]');
  const deleteCustomerButton = event.target.closest('[data-delete-customer]');
  const editContactButton = event.target.closest('[data-edit-contact]');
  const deleteContactButton = event.target.closest('[data-delete-contact]');
  const qrButton = event.target.closest('[data-qr-customer]');

  if (editCustomerButton) {
    const customer = data.customers.find(c => c.id === editCustomerButton.dataset.editCustomer);
    if (customer) openCustomerDialog(customer);
  }

  if (deleteCustomerButton) {
    const customerId = deleteCustomerButton.dataset.deleteCustomer;
    if (confirm('Ta bort kunden och dess kontaktpersoner?')) {
      data.customers = data.customers.filter(c => c.id !== customerId);
      data.contacts = data.contacts.filter(c => c.customerId !== customerId);
      saveData();
      render();
    }
  }

  if (editContactButton) {
    const contact = data.contacts.find(c => c.id === editContactButton.dataset.editContact);
    if (contact) openContactDialog(contact);
  }

  if (deleteContactButton) {
    const contactId = deleteContactButton.dataset.deleteContact;
    if (confirm('Ta bort kontaktpersonen?')) {
      data.contacts = data.contacts.filter(c => c.id !== contactId);
      saveData();
      render();
    }
  }

  if (qrButton) {
    showQr(qrButton.dataset.qrCustomer);
  }
});

document.getElementById('bg-input')?.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  document.body.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
});

document.getElementById('clear-bg')?.addEventListener('click', () => {
  document.body.style.backgroundImage = '';
});

render();
