import { handleLogin, handleRegistration, handleLogout } from '../controllers/authController.js';
import Router from 'express';

const router = Router();

router.post('/login', handleLogin);
router.post('/register', handleRegistration);
router.post('/logout', handleLogout);

export default router;