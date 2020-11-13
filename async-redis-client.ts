import { RedisClient } from 'redis'
import * as redis from 'redis'
import { fromCallback } from './promise-utils'
import { RefreshAccessTokenResponse } from './types'

// A RedisClient wrapper that uses promises instead of callbacks
export default class AsyncRedisClient {
  private client: RedisClient
  private static instance: AsyncRedisClient

  constructor() {
    if (AsyncRedisClient.instance) {
      return AsyncRedisClient.instance
    }
    this.client = redis.createClient({})
    this.client.on('connect', function () {
      console.log('Redis connected')
    })
    this.client.on('error', function (err) {
      console.log('Redis error: ' + err)
    })
    AsyncRedisClient.instance = this
  }
  async get(key: string): Promise<string | undefined> {
    return fromCallback<string | undefined>((cb) => this.client.get(key, cb))
  }
  async del(...keys: string[]): Promise<number> {
    return fromCallback<number>((cb) => this.client.del(...keys, cb))
  }
  async expire(key: string, seconds: number): Promise<number> {
    return fromCallback<number>((cb) => this.client.expire(key, seconds, cb))
  }
  async set(key: string, value: string): Promise<'OK' | undefined> {
    return fromCallback<'OK' | undefined>((cb) => this.client.set(key, value, cb))
  }
  async setExt(key: string, value: string, mode: string, duration: number): Promise<'OK' | undefined> {
    return fromCallback<'OK' | undefined>((cb) => this.client.set(key, value, mode, duration, cb))
  }

  getCode = async (): Promise<string> => await this.get('code')
  setCode = async (code: string): Promise<string> => await this.set('code', code)
  getAccessToken = async (): Promise<string> => await this.get('accessToken')
  getrefreshToken = async (): Promise<string> => await this.get('refreshToken')
  setAccessToken = async (accessToken: string): Promise<string> => await this.set('accessToken', accessToken)
  setTokens = async (tokens: RefreshAccessTokenResponse): Promise<void> => {
    await this.set('accessToken', tokens.access_token)
    await this.set('refreshToken', tokens.refresh_token)
  }
}
