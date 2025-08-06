import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  path: string;
  userId: mongoose.Types.ObjectId;
  framework?: string;
  nodeVersion?: string;
  packageCount: number;
  outdatedCount: number;
  vulnerabilityCount: number;
  lastScanned: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    framework: {
      type: String,
      trim: true,
    },
    nodeVersion: {
      type: String,
      trim: true,
    },
    packageCount: {
      type: Number,
      default: 0,
    },
    outdatedCount: {
      type: Number,
      default: 0,
    },
    vulnerabilityCount: {
      type: Number,
      default: 0,
    },
    lastScanned: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure each user can't have duplicate project names
ProjectSchema.index({ userId: 1, name: 1 }, { unique: true });

// Add compound index for efficient user project queries
ProjectSchema.index({ userId: 1, lastScanned: -1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
