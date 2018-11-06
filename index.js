const skygear = require('skygear')
const skygearCloud = require('skygear/cloud')
const stripe = require('stripe')('<your-stripe-private-key>')

const PaymentRecord = skygear.Record.extend('payment_record')

async function processPayment(param) {
  const {product_name, product_price, stripe_token, user_email, currency = 'usd'} = param.args

  let charge

  // Create Stripe Charge
  try {
    charge = await new Promise((resolve, reject) => {
      stripe.charges.create({
        amount: product_price,
        currency,
        description: `Charging ${product_price / 100} USD for ${product_name}`,
        receipt_email: user_email,
        source: stripe_token,
        metadata: {
          product: product_name
        }
      }, (err, ch) => {
        if (err) {
          reject(err)
        }
        resolve(ch)
      })
    })
  } catch (_) {
    return {results: 'failed'}
  }

  // Create payment record on Skygear
  try {
    const skygear_container = skygearCloud.getContainer('<your-user-id>')
    
    const skygear_record = await skygear_container.publicDB.save(
      new PaymentRecord({
        receipt_email: charge.receipt_email,
        amount: parseInt(charge.amount / 100),
        product: charge.metadata.product
      })
    )
  } catch (_) {
    return {results: 'Skygear failed'}
  }
  return {results: 'success'}
}

skygearCloud.op('process_payment', processPayment)
