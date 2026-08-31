# Razorpay Setup — Frame Wala

This explains exactly what's already built into the site, and exactly what
you still need to configure to accept real online payments.

## What's already in the site

- `script.js` has a `CONFIG.RAZORPAY_KEY_ID` placeholder and loads Razorpay's
  Checkout.js SDK on `index.html`.
- The order modal has a **"Pay online with Razorpay"** button. Right now it's
  intentionally inactive — clicking it just points you back to the WhatsApp
  button — because a real payment button needs the two things below.

**Until both are in place, the site correctly falls back to WhatsApp
ordering.** That's not a bug — it's what keeps the site honest: a payment
button that *looked* live but couldn't actually verify payment would be
worse than no button at all.

## What you still need

### 1. A Razorpay account
Sign up at [razorpay.com](https://razorpay.com) and complete KYC. From your
dashboard you'll get two keys:

| Key | Where it's used | Keep it secret? |
|---|---|---|
| **Key ID** (`rzp_live_...` / `rzp_test_...`) | Frontend — paste into `CONFIG.RAZORPAY_KEY_ID` in `script.js` | No — this one is meant to be public |
| **Key Secret** | Backend only | **Yes — never put this in `script.js`, HTML, or anywhere a browser can read it** |

### 2. A backend (this is the part a static site can't do)

`index.html`/`style.css`/`script.js` are static files — they have nowhere to
securely hold a secret key, verify a payment signature, or store an order
record. You need a small server-side component with three things:

**Environment variables** (set on your backend host, never in this repo):
```
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

**Two endpoints:**

- `POST /create-order` — server creates a Razorpay order using the Key
  Secret, using the price *you* set server-side (never trust a price sent
  from the browser), and returns the `order_id` + `amount` to the page.
- `POST /verify-payment` — after checkout, the browser sends back
  `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`. Your
  server recomputes the signature with the Key Secret and only marks the
  order "Paid" if it matches.

**Example (Node/Express-style — adapt to whichever backend you deploy):**

```js
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1) Create order — amount decided by YOUR server, in paise
app.post('/create-order', async (req, res) => {
  const amountInPaise = getPriceForProduct(req.body.product, req.body.quantity); // your own pricing logic
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `fw_${Date.now()}`,
  });
  res.json({ orderId: order.id, amount: order.amount, keyId: process.env.RAZORPAY_KEY_ID });
});

// 2) Verify payment — never trust the frontend's word alone
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected === razorpay_signature) {
    // Signature matches — NOW it's safe to mark this order "Paid" in your database
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false });
  }
});
```

**Webhook (recommended in addition to the above):** configure a webhook URL
in your Razorpay dashboard pointing at another endpoint on your backend, so
you get a server-to-server confirmation even if the customer closes their
browser mid-payment. Verify its signature the same way, using
`RAZORPAY_WEBHOOK_SECRET`.

### 3. Where to run this backend

Since this project doesn't have one yet, the two realistic options are:

- **Supabase Edge Functions** — you already have a Supabase connector
  available in this chat. I can scaffold the two functions above, a
  `orders` table to store order records, and a `photos` storage bucket for
  customer uploads — if you'd like me to set that up, just say so (it
  involves creating real cloud resources, so I'll confirm with you before
  doing it).
- **Any Node host** (Render, Railway, a VPS, etc.) running the Express
  example above, with a database of your choice for order records.

### 4. Once the backend exists

1. Replace `CONFIG.RAZORPAY_KEY_ID` in `script.js` with your real Key ID.
2. In `script.js`, replace the `TODO` lines in the `pay-razorpay` click
   handler: fetch `order_id`/`amount` from your `/create-order` endpoint
   before opening Checkout, and POST the result to `/verify-payment` inside
   the `handler` callback before showing any "order confirmed" state.
3. Only show a success screen (see `order-success-preview.html` for the
   design) after `/verify-payment` responds `verified: true`.
