import { Router } from 'express';
import {
  getProjects,
  getProject,
  getProjectStatusByName,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController';

const router = Router();

// Get all projects
router.get('/', getProjects);

// Get project by id
router.get('/:id', getProject);

// Get project status by name - used by VS Code extension
router.get('/:name/status', getProjectStatusByName);

// Create new project
router.post('/', createProject);

// Update project
router.put('/:id', updateProject);

// Delete project
router.delete('/:id', deleteProject);

export default router;
