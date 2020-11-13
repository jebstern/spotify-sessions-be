import axios from 'axios'
const axiosApiInstance = axios.create()
import { CLIENT_ID, CLIENT_SECRET, PLAYLIST_ID, REDIRECT_URL } from './constants'
import AsyncRedisClient from './async-redis-client'
import queryString from 'query-string'
import { CurrentlyPlaying, Playlist, RefreshedAccessTokenResponse, User } from './types'

const asyncRedisClient = new AsyncRedisClient()

const refreshToken = async (): Promise<RefreshedAccessTokenResponse> => {
  const refresh_token = await asyncRedisClient.getrefreshToken()
  const data: RefreshedAccessTokenResponse = await axios
    .post(
      'https://accounts.spotify.com/api/token',
      queryString.stringify({ grant_type: 'refresh_token', refresh_token }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
        },
      }
    )
    .then((res) => res.data)
    .catch((error) => console.log('refreshToken ERROR! ' + error.message))
  console.log('--- refreshToken() DONE --- access_token:' + data.access_token)
  return data
}

axiosApiInstance.interceptors.request.use(
  async (config) => {
    config.headers = {
      Authorization: `Bearer ${await asyncRedisClient.getAccessToken()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    return config
  },
  (error) => {
    Promise.reject(error)
  }
)

const interceptor = axiosApiInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log('Axios response error in interceptor:', error)
    if (error.response.status === 401) {
      /*
       * When response code is 401, try to refresh the token.
       * Eject the interceptor so it doesn't loop in case
       * token refresh causes the 401 response
       */
      axios.interceptors.response.eject(interceptor)
      const data: RefreshedAccessTokenResponse = await refreshToken()
      if (!data || data === undefined) {
        return Promise.reject(error)
      }
      await asyncRedisClient.setAccessToken(data.access_token)

      error.response.config.headers['Authorization'] = 'Bearer ' + data.access_token
      return axiosApiInstance(error.response.config)
    }
    return Promise.reject(error)
  }
)

export const getRefreshAccessTokens = async (): Promise<void> => {
  const code = await asyncRedisClient.getCode()
  console.log('getRefreshAccessTokens')
  await axios
    .post(
      'https://accounts.spotify.com/api/token',
      queryString.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URL,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )
    .then(async (res) => {
      await asyncRedisClient.setTokens(res.data)
    })
    .catch((_error) => console.log('getRefreshAccessTokens ERROR!'))
}

export async function currentlyPlaying(): Promise<CurrentlyPlaying> {
  return axiosApiInstance
    .get('https://api.spotify.com/v1/me/player')
    .then((response) => response.data)
    .catch((error) => console.log('currentlyPlaying ERROR!' + error.message))
}

export async function playlist(): Promise<Playlist> {
  return axiosApiInstance
    .get(
      `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?fields=items(added_by.id%2Ctrack(id%2Cduration_ms%2Cname%2Calbum(name%2C%20images%2Cartists)))`
    )
    .then((response) => response.data)
    .catch((error) => console.log('playlist ERROR! ' + error.message))
}

export async function getUser(username: string): Promise<User> {
  return axiosApiInstance
    .get(`https://api.spotify.com/v1/users/${username}`)
    .then((response) => response.data)
    .catch((error) => console.log('getUser ERROR! ' + error.message))
}

export async function playSongAtOffsetPosition(position: number): Promise<void> {
  axiosApiInstance.put('https://api.spotify.com/v1/me/player/play', {
    context_uri: `spotify:playlist:${PLAYLIST_ID}`,
    offset: {
      position,
    },
    position_ms: 0,
  })
}

export async function shuffle(shuffle: boolean): Promise<void> {
  axiosApiInstance.put(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffle}`)
}

export async function play(): Promise<void> {
  await axiosApiInstance
    .put('https://api.spotify.com/v1/me/player/play')
    .catch((error) => console.log('play ERROR! ' + error.message))
}

export async function pause(): Promise<void> {
  await axiosApiInstance
    .put('https://api.spotify.com/v1/me/player/pause')
    .catch((error) => console.log('pause ERROR! ' + error.message))
}

export async function next(): Promise<void> {
  await axiosApiInstance.post('https://api.spotify.com/v1/me/player/next')
}

export async function previous(): Promise<void> {
  await axiosApiInstance.post('https://api.spotify.com/v1/me/player/previous')
}

export async function add(trackURI: string): Promise<void> {
  axiosApiInstance.post(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?uris=${trackURI}`)
}
