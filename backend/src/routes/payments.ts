import { Router } from 'express';
const router = Router();

router.post('/', (req, res) => {
  console.log('Payment webhook received:', req.body);
  res.send('Payment webhook received');
});

export default router;
