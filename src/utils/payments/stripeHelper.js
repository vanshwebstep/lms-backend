const env = require('../../config/env')

let _stripe = null
const getStripe = () => {
  if (!_stripe) {
    if (!env.stripe.secretKey) {
      throw new Error('Stripe secret key not configured')
    }
    _stripe = require('stripe')(env.stripe.secretKey)
  }
  return _stripe
}

// ---------------- CREATE + CONFIRM PAYMENT IN ONE STEP ----------------
const createAndConfirmPayment = async (
  amount,
  currency = 'inr',
  cardDetails = {},
  metadata = {},
  customerEmail = ''
) => {
  const stripe = getStripe()
  const amountInPaise = Math.round(Number(amount) * 100)

  const customer = await stripe.customers.create({
    email: customerEmail,
    name: metadata.name || cardDetails.name || undefined,
  })

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInPaise,
    currency: (currency || 'inr').toLowerCase(),
    customer: customer.id,
    payment_method: 'pm_card_visa',
    confirm: true,
    metadata,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  })

  return paymentIntent
}

module.exports = {
  get stripe() {
    return getStripe()
  },
  createAndConfirmPayment,
}