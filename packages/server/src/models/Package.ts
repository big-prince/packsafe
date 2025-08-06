import mongoose, { Schema, Document } from 'mongoose';

export interface IPackage extends Document {
  name: string;
  version: string;
  latestVersion?: string;
  isOutdated: boolean;
  hasVulnerabilities: boolean;
  vulnerabilityCount: number;
  license?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  projectId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PackageSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    latestVersion: {
      type: String,
      trim: true,
    },
    isOutdated: {
      type: Boolean,
      default: false,
    },
    hasVulnerabilities: {
      type: Boolean,
      default: false,
    },
    vulnerabilityCount: {
      type: Number,
      default: 0,
    },
    license: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    homepage: {
      type: String,
      trim: true,
    },
    repository: {
      type: String,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a clustered index on package_name for fast lookups
PackageSchema.index({ name: 1 });

// Create a composite index on (project_id, version) for project-specific queries
PackageSchema.index({ projectId: 1, version: 1 });

// Each project should have unique package names
PackageSchema.index({ projectId: 1, name: 1 }, { unique: true });

export const Package = mongoose.model<IPackage>('Package', PackageSchema);
