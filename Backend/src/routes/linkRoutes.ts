import Router from 'express';
import {
  handleDeleteLink,
  handleGetLinkStatsByCountry,
  handleGetUserLinks,
  handleShortenLink,
  handleUpdateLink,
} from '../controllers/linkController.js';
import authenticateAccessToken from '../middleware/authenticateToken.js';

const router = Router();

router.post('/', authenticateAccessToken, handleShortenLink);
router.get('/', authenticateAccessToken, handleGetUserLinks);
router.get('/:short_url/stats', authenticateAccessToken, handleGetLinkStatsByCountry);
router.patch('/:short_url', authenticateAccessToken, handleUpdateLink);
router.delete('/:short_url', authenticateAccessToken, handleDeleteLink);

export default router;
