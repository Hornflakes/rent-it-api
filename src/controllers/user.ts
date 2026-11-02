import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HydratedDocument } from 'mongoose';
import { AccessTokenPayload } from '../middleware/verifyAccessToken';
import User, { IUser } from '../models/user';

type RefreshTokenPayload = { id: string; username: string };
type Credentials = { username: string; password: string };

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 16);
const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'none' } as const;
const REFRESH_MAX_AGE = 1000 * 60 * 60 * 24;

const hasCredentials = (body: unknown): body is Credentials =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as Partial<Credentials>).username === 'string' &&
  typeof (body as Partial<Credentials>).password === 'string';

const signTokens = (user: HydratedDocument<IUser>) => {
  const id = user._id.toString();
  const accessPayload: AccessTokenPayload = { id, username: user.username, role: user.role };
  const refreshPayload: RefreshTokenPayload = { id, username: user.username };

  return {
    accessToken: jwt.sign(accessPayload, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '10s' }),
    refreshToken: jwt.sign(refreshPayload, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: '1d' }),
  };
};

const liveTokens = (tokens: string[] = []): string[] =>
  tokens.filter((token) => {
    try {
      jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!);
      return true;
    } catch {
      return false;
    }
  });

const sendTokens = (response: Response, status: number, tokens: ReturnType<typeof signTokens>) =>
  response
    .cookie(REFRESH_COOKIE, tokens.refreshToken, { ...REFRESH_COOKIE_OPTIONS, maxAge: REFRESH_MAX_AGE })
    .status(status)
    .json({ accessToken: tokens.accessToken });

const addUser = async (request: Request, response: Response) => {
  if (!hasCredentials(request.body)) {
    return response.status(400).json({ message: 'username and password are required' });
  }
  const { username, password } = request.body;

  const alreadyExists = await User.findOne({ username });
  if (alreadyExists) {
    return response.status(409).json({ message: 'User already exists' });
  }

  const user = await User.create({ username, password: await bcrypt.hash(password, 16), role: 'client' });
  const tokens = signTokens(user);
  user.refreshToken = [tokens.refreshToken];
  await user.save();

  return sendTokens(response, 201, tokens);
};

const login = async (request: Request, response: Response) => {
  if (!hasCredentials(request.body)) {
    return response.status(400).json({ message: 'username and password are required' });
  }
  const { username, password } = request.body;

  const user = await User.findOne({ username });
  const validPassword = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !validPassword) {
    return response.status(401).json({ message: 'Invalid credentials' });
  }

  const tokens = signTokens(user);
  user.refreshToken = [...liveTokens(user.refreshToken), tokens.refreshToken];
  await user.save();

  return sendTokens(response, 200, tokens);
};

const logout = async (request: Request, response: Response) => {
  const refreshToken: unknown = request.cookies?.[REFRESH_COOKIE];
  if (typeof refreshToken === 'string') {
    response.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
    await User.updateOne({ refreshToken }, { $pull: { refreshToken } });
  }
  return response.status(204).end();
};

const handleRefreshToken = async (request: Request, response: Response) => {
  const refreshToken: unknown = request.cookies?.[REFRESH_COOKIE];
  if (typeof refreshToken !== 'string') {
    return response.status(401).json({ message: 'No refresh token' });
  }
  response.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);

  let decoded: RefreshTokenPayload;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as RefreshTokenPayload;
  } catch {
    await User.updateOne({ refreshToken }, { $pull: { refreshToken } });
    return response.status(401).json({ message: 'Invalid refresh token' });
  }

  const user = await User.findOne({ refreshToken });
  if (!user) {
    await User.updateOne({ username: decoded.username }, { refreshToken: [] });
    return response.status(401).json({ message: 'Reused refresh token' });
  }
  if (user.username !== decoded.username) {
    return response.status(401).json({ message: 'Invalid refresh token' });
  }

  const tokens = signTokens(user);
  user.refreshToken = [...liveTokens(user.refreshToken).filter((rt) => rt !== refreshToken), tokens.refreshToken];
  await user.save();

  return sendTokens(response, 200, tokens);
};

export default { addUser, login, logout, handleRefreshToken };
