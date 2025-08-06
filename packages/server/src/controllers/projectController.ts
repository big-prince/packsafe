import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get all projects for the authenticated user
 */
export const getProjects = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    const projects = await Project.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    logger.error('Error fetching projects:', error);
    next(error);
  }
};

/**
 * Get a single project by ID
 */
export const getProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    const project = await Project.findOne({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Error fetching project:', error);
    next(error);
  }
};

/**
 * Get project status by project name
 */
export const getProjectStatusByName = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const projectName = req.params.name;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Search for the project by name and userId
    const project = await Project.findOne({
      name: projectName,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      // For new projects, return zeros
      return res.status(200).json({
        success: true,
        outdated: 0,
        vulnerable: 0,
      });
    }

    return res.status(200).json({
      success: true,
      outdated: project.outdatedCount,
      vulnerable: project.vulnerabilityCount,
    });
  } catch (error) {
    logger.error('Error fetching project status:', error);
    next(error);
  }
};

/**
 * Create a new project
 */
export const createProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const project = await Project.create({
      ...req.body,
      userId: new mongoose.Types.ObjectId(userId),
    });

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Error creating project:', error);

    // Check for duplicate key error
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as any).code === 11000
    ) {
      return res.status(400).json({
        success: false,
        message: 'A project with this name already exists',
      });
    }

    next(error);
  }
};

/**
 * Update a project
 */
export const updateProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: new mongoose.Types.ObjectId(userId),
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Error updating project:', error);
    next(error);
  }
};

/**
 * Delete a project
 */
export const deleteProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    logger.error('Error deleting project:', error);
    next(error);
  }
};
