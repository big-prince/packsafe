import mongoose, { Schema, Document } from 'mongoose';

export interface IScanResult extends Document {
  userId: mongoose.Types.ObjectId;
  projectName: string;
  filePath: string;
  packageJsonContent: any;
  scanDate: Date;
  summary: {
    total: number;
    outdated: number;
    vulnerable: number;
  };
  dependencies: {
    outdated: Record<string, any>;
    vulnerable: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ScanResultSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    packageJsonContent: {
      type: Schema.Types.Mixed,
      required: true,
    },
    scanDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    summary: {
      total: {
        type: Number,
        required: true,
        min: 0,
      },
      outdated: {
        type: Number,
        required: true,
        min: 0,
      },
      vulnerable: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    dependencies: {
      outdated: {
        type: Schema.Types.Mixed,
        default: {},
      },
      vulnerable: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
  },
  {
    timestamps: true,
    collection: 'scanresults',
  }
);

// Create indexes for better query performance
ScanResultSchema.index({ userId: 1, scanDate: -1 });
ScanResultSchema.index({ userId: 1, projectName: 1 });
ScanResultSchema.index({ scanDate: -1 });

// Instance methods
ScanResultSchema.methods.toJSON = function () {
  const scanResult = this.toObject();
  return {
    id: scanResult._id,
    userId: scanResult.userId,
    projectName: scanResult.projectName,
    filePath: scanResult.filePath,
    scanDate: scanResult.scanDate,
    summary: scanResult.summary,
    dependencies: scanResult.dependencies,
    createdAt: scanResult.createdAt,
    updatedAt: scanResult.updatedAt,
  };
};

export const ScanResult = mongoose.model<IScanResult>(
  'ScanResult',
  ScanResultSchema
);
