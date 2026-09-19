const AppError = require('../utils/AppError');

/**
 * Creates a middleware that validates request data against Joi schema(s).
 *
 * Usage:
 *   validate(schema, 'body')
 *   validate(schema, 'query')
 *   validate(schema, 'params')
 *   validate({ body: bodySchema, params: paramsSchema, query: querySchema })
 */
const validate = (schemaOrMap, defaultSource = 'body') => {
  return (req, res, next) => {
    let validationTargets = {};

    if (schemaOrMap && typeof schemaOrMap.validate === 'function') {
      // Single Joi schema provided with source
      validationTargets[defaultSource] = schemaOrMap;
    } else if (typeof schemaOrMap === 'object') {
      // Map of sources provided, e.g. { body: ..., params: ..., query: ... }
      validationTargets = schemaOrMap;
    }

    const errors = [];

    for (const [source, schema] of Object.entries(validationTargets)) {
      if (!schema || typeof schema.validate !== 'function') continue;

      const dataToValidate = req[source] || {};
      const { value, error } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        error.details.forEach((detail) => {
          errors.push(detail.message.replace(/['"]/g, ''));
        });
      } else {
        // Assign validated and sanitized values (except req.query in Express 5 which is a getter)
        if (source === 'query') {
          // Mutate properties inside req.query
          Object.keys(req.query).forEach((key) => {
            if (!(key in value)) {
              delete req.query[key];
            }
          });
          Object.assign(req.query, value);
        } else {
          req[source] = value;
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError(`Validation error: ${errors.join('. ')}`, 400));
    }

    next();
  };
};

module.exports = validate;
