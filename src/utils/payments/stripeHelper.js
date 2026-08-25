const env = require('../../config/env')
const stripe = require('stripe')(env.stripe.secretKey || process.env.STRIPE_SECRET_KEY)

// ---------------- CREATE + CONFIRM PAYMENT IN ONE STEP ----------------
const createAndConfirmPayment = async (
  amount,
  currency = 'inr',
  cardDetails = {},
  metadata = {},
  customerEmail = ''
) => {
  const amountInPaise = Math.round(Number(amount) * 100)

  // create a customer first
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
  stripe,
  createAndConfirmPayment,
}
