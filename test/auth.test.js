const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../db', () => ({
    getDb: jest.fn()
}));
const { getDb } = require('../db');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

let users = [];

beforeEach(() => {
    users = [];
    getDb.mockReturnValue({
        collection: jest.fn(() => ({
            findOne: jest.fn((query) => users.find(u => u.email === query.email)),
            insertOne: jest.fn((user) => users.push(user))
        }))
    });
});

describe('Auth API', () => {
    describe('POST /auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app).post('/auth/register').send({
                email: 'csnaidu14@gmail.com',
                password: 'password123'
            });
            expect(res.status).toBe(201);
            expect(res.body.message).toBe('User registered successfully');
        });

        it('should not register an existing user', async () => {
            users.push({ email: 'csnaidu14@gmail.com', password: 'hashed' });

            const res = await request(app).post('/auth/register').send({
                email: 'csnaidu14@gmail.com',
                password: 'password123'
            });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('User already exists');
        });

        it('should return 400 for missing fields', async () => {
            const res = await request(app).post('/auth/register').send({});
            expect(res.status).toBe(400);
        });
    });

    describe('POST /auth/login', () => {
        it('should login a valid user and return token', async () => {
            const email = 'test@example.com';
            const password = 'password123';
            const hashedPassword = await bcrypt.hash(password, 10);
            users.push({ email, password: hashedPassword });

            const res = await request(app).post('/auth/login').send({ email, password });
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Login Successfully');
            expect(res.body.token).toBeDefined();
        });

        it('should not login with incorrect password', async () => {
            users.push({ email: 'test@example.com', password: await bcrypt.hash('rightpass', 10) });

            const res = await request(app).post('/auth/login').send({
                email: 'test@example.com',
                password: 'wrongpass'
            });

            expect(res.status).toBe(400);
        });

        it('should return 400 if user not found', async () => {
            const res = await request(app).post('/auth/login').send({
                email: 'nonexist@example.com',
                password: 'password123'
            });

            expect(res.status).toBe(400);
        });
    });

    
    
});
