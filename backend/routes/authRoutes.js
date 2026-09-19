const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');
const { signupSchema, loginSchema } = require('../validators/authValidator');

const router = express.Router();

router.post('/signup', validate(signupSchema, 'body'), authController.signup);
router.post('/login', validate(loginSchema, 'body'), authController.login);
router.post('/logout', authController.logout);

module.exports = router;
