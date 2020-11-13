/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import * as api from './api'
import { CurrentlyPlaying, Playlist, User } from './types'
import AsyncRedisClient from './async-redis-client'
import routes from './routes/'

const PORT = process.env.PORT || 3001
const asyncRedisClient = new AsyncRedisClient()
const allowCrossDomain = function (req: any, res: any, next: any) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
}
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
app.use(express.static(__dirname)).use(cors()).use(cookieParser())
app.use(allowCrossDomain)
app.use(routes)

let interval: NodeJS.Timeout

const server = require('http').createServer(app)
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true,
  },
})

const getCurrentlyPlaying = async () => {
  const currentlyPlaying: CurrentlyPlaying = await api.currentlyPlaying()
  io.emit('currentlyPlaying', currentlyPlaying)
}

const getUser = async () => {
  const user1: User = await api.getUser('jebexstern')
  const user2: User = await api.getUser('bayiron')
  const user3: User = await api.getUser('dnaks')
  const users: User[] = [user1, user2, user3]
  io.emit('users', users)
}

const getPlaylist = async () => {
  const playlist: Playlist = await api.playlist()
  io.emit('playlist', playlist)
}

const singleEmitData = async () => {
  const accessToken = await asyncRedisClient.getAccessToken()
  if (!interval && accessToken !== '' && accessToken !== null) {
    interval = setInterval(() => getCurrentlyPlaying(), 1000)
  }
  if (accessToken !== '' && accessToken !== null) {
    await getPlaylist()
    await getUser()
  }
}

io.on('connection', async function (socket: any) {
  console.log('Socket.io client connected')
  io.emit('listeners', socket.server.httpServer._connections)
  await singleEmitData()
  socket.on('disconnect', () => {
    console.log('Socket.io client disconnected')
    io.emit('listeners', socket.server.httpServer._connections)
    if (socket.server.httpServer._connections === 0) {
      //clearInterval(interval)
      //console.log('clearInterval - interval is null: ' + (interval == null))
    }
  })
  socket.on('playlist', () => api.playlist())
  socket.on('code', async (code: string) => {
    asyncRedisClient.setCode(code)
    await api.getRefreshAccessTokens()
    await singleEmitData()
  })
})

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))
