import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Database } from 'better-sqlite3'
import { openDb } from './db.js'
import { createApp } from './app.js'
import { Vault } from '../src/crypto/vault.js'
import { newNote } from '../src/types/note.js'

describe('API auth and note isolation', () => {
  let dbPath: string
  let db: Database
  let app: ReturnType<typeof createApp>

  beforeAll(() => {
    dbPath = path.join(os.tmpdir(), `astranotes-test-${Date.now()}.db`)
    db = openDb(dbPath)
    app = createApp(db, 'test-session-secret')
  })

  afterAll(() => {
    db.close()
    try {
      fs.unlinkSync(dbPath)
    } catch {
      /* ignore */
    }
  })

  it('registers, saves encrypted note, and lists ciphertext only', async () => {
    const vault = new Vault()
    const encryptionMeta = await vault.create('password123')
    const a = request.agent(app)
    await a
      .post('/api/register')
      .send({ username: 'alice', password: 'password123', encryptionMeta })
      .expect(201)

    const note = newNote({ title: 'Hello' })
    const json = JSON.stringify(note)
    const enc = await vault.encrypt(json)
    await a
      .put(`/api/notes/${note.id}`)
      .send({
        v: 2,
        ivB64: enc.ivB64,
        ciphertextB64: enc.ciphertextB64,
        updatedAt: note.updatedAt,
      })
      .expect(204)

    const res = await a.get('/api/notes').expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    const row = res.body[0] as { id: string; updatedAt: number; payload: Record<string, unknown> }
    expect(row.id).toBe(note.id)
    expect(row.payload.v).toBe(2)
    expect(row.payload.title).toBeUndefined()

    const p = row.payload as unknown as { ivB64: string; ciphertextB64: string }
    const plain = await vault.decrypt(p.ivB64, p.ciphertextB64)
    expect(JSON.parse(plain).title).toBe('Hello')
  })

  it('does not let another user overwrite an existing note id', async () => {
    const v1 = new Vault()
    const m1 = await v1.create('password123')
    const a = request.agent(app)
    await a.post('/api/register').send({ username: 'carol', password: 'password123', encryptionMeta: m1 })

    const note = newNote({ title: 'Carol note' })
    const enc = await v1.encrypt(JSON.stringify(note))
    await a
      .put(`/api/notes/${note.id}`)
      .send({
        v: 2,
        ivB64: enc.ivB64,
        ciphertextB64: enc.ciphertextB64,
        updatedAt: note.updatedAt,
      })
      .expect(204)

    const v2 = new Vault()
    const m2 = await v2.create('password123')
    const b = request.agent(app)
    await b.post('/api/register').send({ username: 'dave', password: 'password123', encryptionMeta: m2 })

    const stolenEnc = await v2.encrypt(JSON.stringify({ ...note, title: 'Hacked' }))
    await b
      .put(`/api/notes/${note.id}`)
      .send({
        v: 2,
        ivB64: stolenEnc.ivB64,
        ciphertextB64: stolenEnc.ciphertextB64,
        updatedAt: note.updatedAt,
      })
      .expect(403)

    const list = await a.get('/api/notes').expect(200)
    const row = list.body.find((r: { id: string }) => r.id === note.id) as {
      payload: { ivB64: string; ciphertextB64: string }
    }
    const plain = await v1.decrypt(row.payload.ivB64, row.payload.ciphertextB64)
    expect(JSON.parse(plain).title).toBe('Carol note')
  })

  it('rejects unauthenticated GET, PUT, DELETE with 401', async () => {
    const r = request(app)
    await r.get('/api/notes').expect(401)
    await r.put('/api/notes/some-id').send({ v: 2, ivB64: 'x', ciphertextB64: 'y', updatedAt: 1 }).expect(401)
    await r.delete('/api/notes/some-id').expect(401)
  })

  it('rejects PUT with malformed encrypted payload (400)', async () => {
    const vault = new Vault()
    const meta = await vault.create('password12345')
    const agent = request.agent(app)
    await agent.post('/api/register').send({ username: 'badput', password: 'password12345', encryptionMeta: meta }).expect(201)

    await agent.put('/api/notes/n1').send({ v: 1, ivB64: 'x', ciphertextB64: 'y', updatedAt: 1 }).expect(400)
    await agent.put('/api/notes/n1').send({ v: 2, ciphertextB64: 'y', updatedAt: 1 }).expect(400)
    await agent.put('/api/notes/n1').send({ v: 2, ivB64: 'x', updatedAt: 1 }).expect(400)
    await agent.put('/api/notes/n1').send('garbage').expect(400)
  })

  it('DELETE removes a note and rejects cross-user delete', async () => {
    const v1 = new Vault()
    const m1 = await v1.create('password12345')
    const a = request.agent(app)
    await a.post('/api/register').send({ username: 'del1', password: 'password12345', encryptionMeta: m1 }).expect(201)

    const note = newNote({ title: 'delete me' })
    const enc = await v1.encrypt(JSON.stringify(note))
    await a.put(`/api/notes/${note.id}`).send({ v: 2, ivB64: enc.ivB64, ciphertextB64: enc.ciphertextB64, updatedAt: note.updatedAt }).expect(204)

    await a.delete(`/api/notes/${note.id}`).expect(204)
    const list = await a.get('/api/notes').expect(200)
    expect(list.body).toHaveLength(0)

    await a.delete(`/api/notes/${note.id}`).expect(404)

    const v2 = new Vault()
    const m2 = await v2.create('password12345')
    const b = request.agent(app)
    await b.post('/api/register').send({ username: 'del2', password: 'password12345', encryptionMeta: m2 }).expect(201)
    await b.delete(`/api/notes/${note.id}`).expect(404)
  })
})
