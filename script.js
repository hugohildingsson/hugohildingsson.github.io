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
  qrItems: Array.isArray(customer.qrItems) ? customer.qrItems.map(qr => ({
    id: qr.id || cryptoRandomId(),
    name: qr.name || 'QR-kod',
    image: qr.image || '',
    target: qr.target || '',
    scanCount: Number(qr.scanCount) || 0,
    createdAt: qr.createdAt || new Date().toISOString()
  })) : [],
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

function getTotalQrScans() {
  return data.customers.reduce((sum, customer) => {
    return sum + (customer.qrItems || []).reduce((inner, qr) => inner + (Number(qr.scanCount) || 0), 0);
  }, 0);
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
  document.getElementById('customer-count')?.setAttribute('title', `${getTotalQrScans()} QR-skanningar totalt`);
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
          <div class="record-labels">
            <h3>${escapeHtml(customer.name)} ${statusBadge(customer.status)}</h3>
            <p>${escapeHtml(customer.org || 'Org.nr saknas')} · ${escapeHtml(customer.email || 'Ingen e-post')} · ${escapeHtml(customer.phone || 'Inget telefonnummer')}</p>
            ${customer.qrItems && customer.qrItems.length ? `<p>QR-koder: <strong>${customer.qrItems.length}</strong> · Skannade: <strong>${customer.qrItems.reduce((sum, qr) => sum + (Number(qr.scanCount) || 0), 0)}</strong></p>` : '<p>Inga QR-koder ännu</p>'}
            ${customer.notes ? `<p>${escapeHtml(customer.notes.slice(0, 90))}${customer.notes.length > 90 ? '…' : ''}</p>` : ''}
          </div>
        </div>
        <div class="record-actions">
          <button class="small-button" data-show-company-qr="${escapeHtml(customer.id)}">QR</button>
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
          <div>
            <h3>${escapeHtml(customer.name)} ${statusBadge(customer.status)}</h3>
            <p>${escapeHtml(customer.email || 'Ingen e-post')} · ${escapeHtml(customer.phone || 'Inget telefonnummer')}</p>
            <p>QR-koder: <strong>${(customer.qrItems || []).length}</strong> · Skanningar: <strong>${(customer.qrItems || []).reduce((sum, qr) => sum + (Number(qr.scanCount) || 0), 0)}</strong></p>
          </div>
        </div>
      </article>
    `).join('')
    : '<p class="empty-state">Lägg till din första kund.</p>';
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const target = new Date(`${dateString}T00:00:00`);
  const now = new Date();
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

function renderCompanyOverview() {
  const container = document.getElementById('company-overview-list');
  if (!container) return;

  if (!data.customers.length) {
    container.innerHTML = '<div class="panel empty-company-panel"><p class="empty-state">Inga företag har lagts till ännu.</p></div>';
    return;
  }

  container.innerHTML = data.customers.map(customer => {
    const qrList = (customer.qrItems || []).length
      ? (customer.qrItems || []).map(qr => `
        <div class="qr-card">
          <div class="qr-preview-box">
            <img src="${escapeHtml(qr.image || '')}" alt="QR-kod för ${escapeHtml(qr.name || customer.name)}" />
          </div>
          <div class="qr-meta">
            <h4>${escapeHtml(qr.name || 'QR-kod')}</h4>
            ${qr.target ? `<a href="${escapeHtml(qr.target)}" target="_blank" rel="noreferrer noopener">Öppna länk</a>` : '<span>Ingen länk</span>'}
            <div class="scan-count">Skannad: <strong>${Number(qr.scanCount) || 0}</strong> gånger</div>
            <div class="qr-actions">
              <button class="small-button" data-increment-qr="${escapeHtml(customer.id)}|${escapeHtml(qr.id)}">+1 skanning</button>
              <button class="small-button" data-edit-qr="${escapeHtml(customer.id)}|${escapeHtml(qr.id)}">Redigera</button>
              <button class="small-button delete-button" data-delete-qr="${escapeHtml(customer.id)}|${escapeHtml(qr.id)}">Ta bort</button>
            </div>
          </div>
        </div>
      `).join('')
      : '<div class="empty-qr-box">Inga QR-koder för detta företag ännu.</div>';

    return `
      <article class="company-overview-card panel">
        <div class="company-overview-head">
          <div>
            <h3>${escapeHtml(customer.name)}</h3>
            <p>${escapeHtml(customer.org || 'Inget org.nr')}</p>
          </div>
          <button class="small-button primary-small-button" data-open-qr="${escapeHtml(customer.id)}">+ Lägg till QR-kod</button>
        </div>
        <div class="company-scan-summary">Totalt skannat: <strong>${(customer.qrItems || []).reduce((sum, qr) => sum + (Number(qr.scanCount) || 0), 0)}</strong> gånger</div>
        <div class="qr-grid">${qrList}</div>
      </article>
    `;
  }).join('');
}

function render() {
  renderSummary();
  renderCustomerSelect();
  renderCustomersList();
  renderContactsList();
  renderRecentCustomers();
  renderUpcomingFollowUps();
  renderFollowUpList();
  renderCompanyOverview();
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

function openQrDialog(companyId, qr = null) {
  const dialog = document.getElementById('qr-dialog');
  const form = document.getElementById('qr-form');
  const companyInput = document.getElementById('qr-company-id');
  const editInput = document.getElementById('qr-edit-id');
  const nameInput = document.getElementById('qr-name');
  const imageInput = document.getElementById('qr-image');
  const targetInput = document.getElementById('qr-target');
  const title = document.getElementById('qr-dialog-title');

  form.reset();
  companyInput.value = companyId;
  editInput.value = qr ? qr.id : '';
  title.textContent = qr ? 'Redigera QR-kod' : 'Lägg till QR-kod';

  if (qr) {
    nameInput.value = qr.name || '';
    targetInput.value = qr.target || '';
  }

  imageInput.required = !qr;
  dialog.showModal();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCustomerById(customerId) {
  return data.customers.find(customer => customer.id === customerId);
}

function incrementQrCounter(customerId, qrId) {
  const customer = getCustomerById(customerId);
  if (!customer) return;

  customer.qrItems = (customer.qrItems || []).map(qr => {
    if (qr.id === qrId) {
      return { ...qr, scanCount: Number(qr.scanCount) || 0 + 1 };
    }
    return qr;
  });

  saveData();
  render();
}

function deleteQr(customerId, qrId) {
  const customer = getCustomerById(customerId);
  if (!customer) return;

  customer.qrItems = (customer.qrItems || []).filter(qr => qr.id !== qrId);
  saveData();
  render();
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

document.getElementById('customer-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const customerId = document.getElementById('edit-customer-id').value;
  const existingCustomer = data.customers.find(c => c.id === customerId);

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
    qrItems: existingCustomer ? existingCustomer.qrItems || [] : []
  };

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

document.getElementById('qr-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const companyId = document.getElementById('qr-company-id').value;
  const qrId = document.getElementById('qr-edit-id').value;
  const customer = getCustomerById(companyId);
  if (!customer) return;

  const file = document.getElementById('qr-image').files[0];
  const image = qrId ? (customer.qrItems || []).find(qr => qr.id === qrId)?.image || '' : '';
  const finalImage = file ? await fileToDataUrl(file) : image;

  const nextQr = {
    id: qrId || cryptoRandomId(),
    name: document.getElementById('qr-name').value.trim() || 'QR-kod',
    image: finalImage,
    target: document.getElementById('qr-target').value.trim(),
    scanCount: qrId ? ((customer.qrItems || []).find(qr => qr.id === qrId)?.scanCount || 0) : 0,
    createdAt: qrId ? ((customer.qrItems || []).find(qr => qr.id === qrId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  customer.qrItems = customer.qrItems || [];

  if (qrId) {
    customer.qrItems = customer.qrItems.map(qr => qr.id === qrId ? nextQr : qr);
  } else {
    customer.qrItems.push(nextQr);
  }

  saveData();
  render();
  document.getElementById('qr-dialog').close();
});

document.addEventListener('click', (event) => {
  const editCustomerButton = event.target.closest('[data-edit-customer]');
  const deleteCustomerButton = event.target.closest('[data-delete-customer]');
  const editContactButton = event.target.closest('[data-edit-contact]');
  const deleteContactButton = event.target.closest('[data-delete-contact]');
  const qrOpenButton = event.target.closest('[data-open-qr]');
  const qrEditButton = event.target.closest('[data-edit-qr]');
  const qrDeleteButton = event.target.closest('[data-delete-qr]');
  const qrIncrementButton = event.target.closest('[data-increment-qr]');
  const showCompanyQrButton = event.target.closest('[data-show-company-qr]');

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

  if (qrOpenButton) {
    openQrDialog(qrOpenButton.dataset.openQr);
  }

  if (qrEditButton) {
    const [customerId, qrId] = qrEditButton.dataset.editQr.split('|');
    const customer = getCustomerById(customerId);
    const qr = (customer?.qrItems || []).find(item => item.id === qrId);
    if (customer && qr) openQrDialog(customerId, qr);
  }

  if (qrDeleteButton) {
    const [customerId, qrId] = qrDeleteButton.dataset.deleteQr.split('|');
    if (confirm('Ta bort QR-koden?')) {
      deleteQr(customerId, qrId);
    }
  }

  if (qrIncrementButton) {
    const [customerId, qrId] = qrIncrementButton.dataset.incrementQr.split('|');
    const customer = getCustomerById(customerId);
    const qr = (customer?.qrItems || []).find(item => item.id === qrId);
    if (customer && qr) {
      customer.qrItems = (customer.qrItems || []).map(item => item.id === qrId ? { ...item, scanCount: (Number(item.scanCount) || 0) + 1 } : item);
      saveData();
      render();
    }
  }

  if (showCompanyQrButton) {
    const customer = data.customers.find(c => c.id === showCompanyQrButton.dataset.showCompanyQr);
    if (customer) {
      setTab('company-overview');
      document.getElementById('company-overview-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
