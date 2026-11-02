import mongoose from 'mongoose';

export const roles = ['admin', 'client'] as const;
export type Role = typeof roles[number];

export interface IUser {
  username: string;
  password: string;
  role: Role;
  refreshToken?: string[];
}

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: roles,
  },
  refreshToken: {
    type: [String],
    required: false,
  },
});

const Users = mongoose.model<IUser>('User', UserSchema);
export default Users;
