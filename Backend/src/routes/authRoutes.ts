import { handleLogin, handleRegistration, handleLogout, handleExpiredAccessToken } from '../controllers/authController.js';
import Router from 'express';

const router = Router();

router.post('/login', handleLogin);
router.get('/helloworld', (_req, res) => {
  res.status(200).json('HELLO WORLD');
})
router.post('/register', handleRegistration);
router.post('/logout', handleLogout);
router.post('/token_refresh', handleExpiredAccessToken);

export default router;