import { Router } from 'express';

const router = Router();

// TODO: Implement WhatsApp integration routes
// POST /api/whatsapp/webhook
// POST /api/whatsapp/send
// POST /api/whatsapp/subscribe
// POST /api/whatsapp/unsubscribe

router.post('/webhook', (req, res) => {
  // Placeholder
  res.status(200).json({ message: 'WhatsApp webhook endpoint' });
});

router.post('/send', (req, res) => {
  // Placeholder
  res.status(200).json({ message: 'Send WhatsApp message endpoint' });
});

router.post('/subscribe', (req, res) => {
  // Placeholder
  res
    .status(200)
    .json({ message: 'Subscribe to WhatsApp notifications endpoint' });
});

router.post('/unsubscribe', (req, res) => {
  // Placeholder
  res
    .status(200)
    .json({ message: 'Unsubscribe from WhatsApp notifications endpoint' });
});

export default router;
