import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'

import helmet from 'helmet' // 1. Защита от XSS (Межсайтовый скриптинг)
import rateLimit from 'express-rate-limit' // 6. Защита от DDoS

import csrf from 'csurf'

import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()

// 1. Защита от XSS (Межсайтовый скриптинг)
app.use(helmet())
app.set('trust proxy', 1)

// Connection monitoring
app.use((req, _res, next) => {
  req.aborted = false;
  req.on('close', () => { req.aborted = true; });
  next();
});

app.use(cookieParser())

const allowedOrigin = 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));

// app.use(cors())
// app.use(cors({ origin: ORIGIN_ALLOW, credentials: true }));
// app.use(express.static(path.join(__dirname, 'public')));


app.use(csrf({ cookie: true }));

app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
});

// 4. Защита от переполнения буфера
app.use(json({ limit: '10kb' }))
app.use(urlencoded({ extended: true, limit: '10kb' }))

// 6. Защита от DDoS
app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 минут
      max: 100,
      message: 'Слишком много запросов с этого IP, попробуйте позже',
      standardHeaders: true,
      legacyHeaders: false,
    })
  )

  // 7. Защита от Path Traversal
app.use(serveStatic(path.join(__dirname, 'public')))

app.options('*', cors())
app.use(routes)


app.use(errors())
app.use(errorHandler)

// eslint-disable-next-line no-console

const bootstrap = async () => {
  try {
    await mongoose.connect(DB_ADDRESS)
    await app.listen(PORT, () => console.log('ok'))
  } catch (error) {
    console.error(error)
  }
}

bootstrap()
