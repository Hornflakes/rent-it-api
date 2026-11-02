import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';

require('dotenv').config();

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 16);

const addUser = async (request: Request, response: Response) => {
  try {
    const { username, password, role } = request.body;

    const alreadyExists = await User.findOne({ username });
    if (alreadyExists) {
      return response.status(409).json({ message: 'User already exists' });
    }

    const user = await User.create({
      username,
      password: await bcrypt.hash(password, 16),
      role,
    });

    const accessToken = jwt.sign({ id: user._id, username: user.username }, process.env.ACCESS_TOKEN_SECRET!, {
      expiresIn: '10s',
    });
    const newRefreshToken = jwt.sign({ id: user._id, username: user.username }, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '1d',
    });
    user.refreshToken = [newRefreshToken];
    await user.save();

    return (
      response.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24,
      }) && response.status(201).json({ accessToken })
    );
  } catch (err) {
    return response.status(500).json(err);
  }
};

const logout = async (request: Request, response: Response) => {
  const cookies = request.cookies;
  if (!cookies?.refreshToken) return response.status(204).end();
  const refreshToken = cookies.refreshToken;

  const user = await User.findOne({ refreshToken });
  if (!user) {
    response.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none' });
    return response.status(204).end();
  }

  user.refreshToken = user.refreshToken!.filter((rt) => rt !== refreshToken);
  await user.save();

  response.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none' });
  return response.status(204).end();
};

const login = async (request: Request, response: Response) => {
  try {
    const { username, password } = request.body;
    const user = await User.findOne({ username });
    const validPassword = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !validPassword) {
      return response.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign({ id: user._id, username: user.username }, process.env.ACCESS_TOKEN_SECRET!, {
      expiresIn: '10s',
    });
    const newRefreshToken = jwt.sign({ id: user._id, username: user.username }, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '1d',
    });
    user.refreshToken!.push(newRefreshToken);
    await user.save();

    return (
      response.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24,
      }) && response.status(200).json({ accessToken })
    );
  } catch (err) {
    return response.status(500).json(err);
  }
};

const handleRefreshToken = async (request: Request, response: Response) => {
  const cookies = request.cookies;
  if (!cookies?.refreshToken) return response.status(401).json({ message: 'No refresh token' });
  const refreshToken = cookies.refreshToken;
  response.clearCookie('refreshToken', { httpOnly: true, sameSite: 'none', secure: true });

  const user = await User.findOne({ refreshToken });
  if (!user) {
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!, async (error: any, decoded: any) => {
      if (error) return response.status(403).json({ message: 'Invalid reused refresh token' });
      const hackedUser = await User.findOne({ username: decoded.username });
      hackedUser!.refreshToken = [];
      await hackedUser!.save();
    });
    return response.status(403).json({ message: 'Valid reused refresh token' });
  }

  const updatedRefreshTokenArr = user.refreshToken!.filter((rt) => rt !== refreshToken);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!, async (error: any, decoded: any) => {
    if (error) {
      user.refreshToken = [...updatedRefreshTokenArr];
      await user.save();
    }
    if (error || user.username != decoded.username) {
      return response.status(403).json({ message: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign({ id: user._id, username: user.username }, process.env.ACCESS_TOKEN_SECRET!, {
      expiresIn: '10s',
    });
    const newRefreshToken = jwt.sign({ id: user._id, username: user.username }, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '1d',
    });
    user.refreshToken = [...updatedRefreshTokenArr, newRefreshToken];
    await user.save();

    return (
      response.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24,
      }) && response.status(201).json({ accessToken })
    );
  });
};

export default { addUser, login, logout, handleRefreshToken };
