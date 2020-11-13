import { Router } from 'express'
import { AddSongResponse, OffsetPosition, Shuffle } from '../types'
const router = Router()
import * as api from '../api'

router.get('/', (_req, res, _next) => {
  res.send({ response: 'I am alive' }).status(200)
})

router.get('/play', async (_req, res, _next) => {
  await api.play().then((_response) => res.status(204).send())
})

router.get('/pause', async (_req, res, _next) => {
  await api.pause().then((_response) => res.status(204).send())
})

router.get('/previous', async (_req, res, _next) => {
  await api.previous().then((_response) => res.status(204).send())
})

router.get('/next', async (_req, res, _next) => {
  await api.next().then((_response) => res.status(204).send())
})

router.put('/playSongAtOffsetPosition', (req, _res, _next) => {
  const offsetPosition: OffsetPosition = req.body
  api.playSongAtOffsetPosition(offsetPosition.position)
})

router.put('/shuffle', (req, _res, _next) => {
  const response: Shuffle = req.body
  api.shuffle(response.shuffle)
})

router.post('/add', (req, _res, _next) => {
  const response: AddSongResponse = req.body
  api.add(response.trackURI)
})

export default router
