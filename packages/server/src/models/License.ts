import mongoose, { Schema, Document } from 'mongoose';

export interface ILicense extends Document {
  name: string;
  type: 'permissive' | 'copyleft' | 'proprietary';
  compatibility: string[];
  restrictions: string[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LicenseSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['permissive', 'copyleft', 'proprietary'],
      required: true,
    },
    compatibility: [
      {
        type: String,
        trim: true,
      },
    ],
    restrictions: [
      {
        type: String,
        trim: true,
      },
    ],
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const License = mongoose.model<ILicense>('License', LicenseSchema);
