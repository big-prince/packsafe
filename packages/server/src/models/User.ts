import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin';
  apiKey?: string;
  preferences: {
    notifications: {
      email: boolean;
      whatsapp: boolean;
      desktop: boolean;
    };
    thresholds: {
      vulnerabilitySeverity: 'low' | 'moderate' | 'high' | 'critical';
      outdatedDays: number;
    };
  };
  whatsappNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    apiKey: {
      type: String,
      // Remove unique: true here since we'll handle it in IndexManager
      sparse: true,
    },
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        whatsapp: {
          type: Boolean,
          default: false,
        },
        desktop: {
          type: Boolean,
          default: true,
        },
      },
      thresholds: {
        vulnerabilitySeverity: {
          type: String,
          enum: ['low', 'moderate', 'high', 'critical'],
          default: 'high',
        },
        outdatedDays: {
          type: Number,
          default: 90,
        },
      },
    },
    whatsappNumber: {
      type: String,
      trim: true,
      // Remove unique and sparse here since we'll handle it in IndexManager
    },
  },
  {
    timestamps: true,
  }
);

// Remove manual index creation - IndexManager will handle this
// UserSchema.index({ apiKey: 1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  const user = this;

  // Only hash the password if it's modified (or new)
  if (!user.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Hash the password along with the new salt
    user.password = await bcrypt.hash(user.password as string, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);
