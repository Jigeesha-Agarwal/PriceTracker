const Joi = require('joi');

/**
 * Returns Express middleware that validates req.body against a Joi schema.
 * On failure → 400 JSON with the first validation error message.
 *
 * Usage:
 *   router.post('/products', validate(productSchema), handler);
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: true, stripUnknown: true });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    req.body = value; // replace with sanitised value
    next();
  };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const productSchema = Joi.object({
  url: Joi.string().uri().max(2048).required(),
  name: Joi.string().max(512).optional(),
  source: Joi.string().valid('amazon', 'flipkart', 'custom').default('unknown'),
  poll_interval_minutes: Joi.number().integer().min(5).max(1440).default(60),
});

const alertSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  product_id: Joi.number().integer().positive().required(),
  target_price: Joi.number().positive().precision(2).required(),
  webhook_url: Joi.string().uri().optional(),
});

module.exports = { validate, productSchema, alertSchema };
