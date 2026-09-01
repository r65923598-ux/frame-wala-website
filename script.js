// =====================================================================
// FRAME WALA — SITE CONFIGURATION
// Edit the values below to update contact details and payment setup
// sitewide. Nothing else in this file needs to change for those updates.
// =====================================================================
var CONFIG = {
  // WhatsApp number in international format: country code + number, no
  // "+", no spaces, no leading zero. Used by every WhatsApp button/link
  // on every page (home + all policy pages) via [data-whatsapp-link].
  WHATSAPP_NUMBER: '919653122382',

  // Default pre-filled WhatsApp message. Any link can override this with
  // its own data-whatsapp-message="..." attribute (see the corporate/
  // bulk-order link on the homepage for an example).
  WHATSAPP_DEFAULT_MESSAGE: 'Hello Frame Wala, I want to order a customized Metal Photo Frame. Please share the details.',

  // Official Instagram URL. Used by every [data-instagram-link] element.
  INSTAGRAM_URL: 'https://www.instagram.com/officialframewala',
GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbydO8FQAIrFnftewR4cJnweLTjYvblDmDoVFBT94dxlqS36NI3CVSNt8pyiY6ELuGt6/exec',
  // Razorpay PUBLIC "Key ID" only (starts with rzp_live_ or rzp_test_).
  // Replace the placeholder below once you have a Razorpay account.
  // NEVER put your Razorpay Key SECRET here or anywhere in this file —
  // this file is sent to every visitor's browser, so anything here is
  // public. The secret key belongs only in your backend's environment
  // variables. See RAZORPAY-SETUP.md for exactly what's needed and where.
  RAZORPAY_KEY_ID: 'rzp_test_YOUR_KEY_ID_HERE'
};

document.addEventListener('DOMContentLoaded', function () {
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Apply CONFIG to every WhatsApp / Instagram link on the page ----------
  document.querySelectorAll('[data-whatsapp-link]').forEach(function (el) {
    var msg = el.getAttribute('data-whatsapp-message') || CONFIG.WHATSAPP_DEFAULT_MESSAGE;
    el.href = 'https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
  });
  document.querySelectorAll('[data-instagram-link]').forEach(function (el) {
    el.href = CONFIG.INSTAGRAM_URL;
  });

  // ---------- Mobile menu ----------
  var menuToggle = document.querySelector('.menu-toggle');
  var navLinks = document.querySelector('nav.links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      var open = navLinks.style.display === 'flex';
      navLinks.style.display = open ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '68px';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = '#ffffff';
      navLinks.style.padding = '20px 28px';
      navLinks.style.borderBottom = '1px solid rgba(13,13,13,0.12)';
      menuToggle.setAttribute('aria-expanded', String(!open));
    });
  }

  // ---------- Order modal (only present on the homepage) ----------
  var overlay = document.getElementById('order-modal');
  if (!overlay) return;

  var openButtons = document.querySelectorAll('[data-open-order]');
  var closeButtons = overlay.querySelectorAll('[data-close-order]');
  var formView = document.getElementById('order-form-view');
  var summaryView = document.getElementById('order-summary-view');
  var form = document.getElementById('order-form');
  var fileInput = document.getElementById('order-photo');
  var previewWrap = document.getElementById('upload-preview');
  var previewImg = document.getElementById('upload-preview-img');
  var removeBtn = document.getElementById('upload-remove');
  var fileError = document.getElementById('upload-error');
  var summaryList = document.getElementById('summary-list');
  var sendWaBtn = document.getElementById('send-whatsapp');
  var editBtn = document.getElementById('edit-order');
  var payBtn = document.getElementById('pay-razorpay');

  var currentPhotoName = '';

  function openModal() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    formView.hidden = false;
    summaryView.hidden = true;
  }
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  openButtons.forEach(function (btn) { btn.addEventListener('click', openModal); });
  closeButtons.forEach(function (btn) { btn.addEventListener('click', closeModal); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  // Deep link support: index.html#order opens the modal automatically
  // (used by the "Order Now" links on the policy pages).
  if (window.location.hash === '#order') openModal();

  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var MAX_BYTES = 10 * 1024 * 1024;

  fileInput.addEventListener('change', function () {
    fileError.classList.remove('show');
    var file = fileInput.files[0];
    if (!file) { previewWrap.hidden = true; currentPhotoName = ''; return; }
    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      fileError.textContent = 'Please upload a JPG, PNG or WebP image.';
      fileError.classList.add('show');
      fileInput.value = '';
      previewWrap.hidden = true;
      return;
    }
    if (file.size > MAX_BYTES) {
      fileError.textContent = 'Image is too large — please keep it under 10MB.';
      fileError.classList.add('show');
      fileInput.value = '';
      previewWrap.hidden = true;
      return;
    }
    currentPhotoName = file.name;
    var reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      previewWrap.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', function () {
    fileInput.value = '';
    previewWrap.hidden = true;
    currentPhotoName = '';
  });

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  var lastOrderData = null;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!fileInput.files[0]) {
      fileError.textContent = 'Please upload your photo before continuing.';
      fileError.classList.add('show');
      fileInput.focus();
      return;
    }

    var data = {
      product: document.getElementById('order-product').value,
      quantity: document.getElementById('order-quantity').value,
      name: document.getElementById('order-name').value.trim(),
      mobile: document.getElementById('order-mobile').value.trim(),
      email: document.getElementById('order-email').value.trim(),
      address: document.getElementById('order-address').value.trim(),
      city: document.getElementById('order-city').value.trim(),
      pincode: document.getElementById('order-pincode').value.trim(),
      instructions: document.getElementById('order-instructions').value.trim(),
      photo: currentPhotoName
    };
    lastOrderData = data;

    var rows = [
      ['Product', data.product],
      ['Quantity', data.quantity],
      ['Name', data.name],
      ['Mobile', data.mobile],
      ['Email', data.email],
      ['Address', data.address + ', ' + data.city + ' - ' + data.pincode],
      ['Photo file', data.photo],
      ['Instructions', data.instructions || '—']
    ];
    summaryList.innerHTML = rows.map(function (r) {
      return '<li><span>' + escapeHtml(r[0]) + '</span><span>' + escapeHtml(r[1]) + '</span></li>';
    }).join('');

    var message = 'Hello Frame Wala, I want to order a customized photo frame.\n\n' +
      'Product: ' + data.product + '\n' +
      'Quantity: ' + data.quantity + '\n' +
      'Name: ' + data.name + '\n' +
      'Mobile: ' + data.mobile + '\n' +
      'Email: ' + data.email + '\n' +
      'Address: ' + data.address + ', ' + data.city + ' - ' + data.pincode + '\n' +
      'Instructions: ' + (data.instructions || '-') + '\n\n' +
      '(I will attach my photo in this chat.)';
    sendWaBtn.href = 'https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);

    formView.hidden = true;
    summaryView.hidden = false;
  });

  editBtn.addEventListener('click', function () {
    summaryView.hidden = true;
    formView.hidden = false;
  });

  // ---------- Razorpay (gated until a real Key ID + backend are configured) ----------
  if (payBtn) {
    payBtn.addEventListener('click', function () {
      var keyIsPlaceholder = !CONFIG.RAZORPAY_KEY_ID || CONFIG.RAZORPAY_KEY_ID.indexOf('YOUR_KEY_ID_HERE') !== -1;
      if (keyIsPlaceholder || typeof Razorpay === 'undefined') {
        document.getElementById('razorpay-note').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      // Real integration: activates once CONFIG.RAZORPAY_KEY_ID is a real
      // key AND your backend order-creation endpoint is live (see
      // RAZORPAY-SETUP.md). The amount/order_id below MUST come from your
      // backend — never trust a client-side amount for a real charge.
      var options = {
        key: CONFIG.RAZORPAY_KEY_ID,
        amount: 0, // TODO: paise amount from your backend's created order
        currency: 'INR',
        name: 'Frame Wala',
        description: lastOrderData ? lastOrderData.product : 'Custom photo frame order',
        order_id: '', // TODO: order_id from your backend's create-order response
        handler: function (response) {
          // TODO: POST response.razorpay_payment_id/order_id/signature to
          // your backend's /verify-payment endpoint. Only show an order
          // success screen after that endpoint confirms the signature —
          // never mark an order paid from this callback alone.
        },
        prefill: {
          name: lastOrderData ? lastOrderData.name : '',
          email: lastOrderData ? lastOrderData.email : '',
          contact: lastOrderData ? lastOrderData.mobile : ''
        },
        theme: { color: '#c9a227' }
      };
      var rzp = new Razorpay(options);
      rzp.open();
    });
  }
});
