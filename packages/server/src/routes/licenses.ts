import { Router } from 'express';

const router = Router();

// TODO: Implement license routes
// GET /api/licenses
// GET /api/licenses/:name
// GET /api/licenses/compatibility/:license1/:license2

router.get('/', (req, res) => {
  // Placeholder
  res.status(200).json({ message: 'Get all licenses endpoint' });
});

router.get('/:name', (req, res) => {
  // Placeholder
  res.status(200).json({ message: `Get license ${req.params.name} endpoint` });
});

router.get('/compatibility/:license1/:license2', (req, res) => {
  // Placeholder
  res.status(200).json({
    message: `Check compatibility between ${req.params.license1} and ${req.params.license2} endpoint`,
  });
});

export default router;
