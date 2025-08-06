import { Router } from 'express';

const router = Router();

// TODO: Implement package routes
// GET /api/packages
// GET /api/packages/:name
// GET /api/packages/:name/versions
// GET /api/packages/:name/vulnerabilities

router.get('/', (req, res) => {
  // Placeholder
  res.status(200).json({ message: 'Get all packages endpoint' });
});

router.get('/:name', (req, res) => {
  // Placeholder
  res.status(200).json({ message: `Get package ${req.params.name} endpoint` });
});

router.get('/:name/versions', (req, res) => {
  // Placeholder
  res
    .status(200)
    .json({ message: `Get versions for package ${req.params.name} endpoint` });
});

router.get('/:name/vulnerabilities', (req, res) => {
  // Placeholder
  res
    .status(200)
    .json({
      message: `Get vulnerabilities for package ${req.params.name} endpoint`,
    });
});

export default router;
