import * as dotenv from 'dotenv'
dotenv.config()

export const CLIENT_ID = process.env.CLIENT_ID
export const CLIENT_SECRET = process.env.CLIENT_SECRET
export const REDIRECT_URL = process.env.REDIRECT_URL
export const STATE_KEY = 'spotify-session-state-key-09876-54321'
export const PLAYLIST_ID = process.env.PLAYLIST_ID
