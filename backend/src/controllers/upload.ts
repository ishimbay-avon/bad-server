import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import path from 'path'
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.file) {
    return next(new BadRequestError('Файл не загружен'))
  }

  if (req.file.size < 2 * 1024) {
    return next(new BadRequestError('Размер файла должен быть больше 2KB'))
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  if (req.file.size > MAX_FILE_SIZE) {
    return next(new BadRequestError('Размер файла не должен превышать 5MB'))
  }

  try {
    const fileName = process.env.UPLOAD_PATH_TEMP
      ? path.join('/', process.env.UPLOAD_PATH_TEMP, req.file.filename)
      : path.join('/', req.file.filename)

    return res.status(constants.HTTP_STATUS_CREATED).send({ fileName })
  } catch (error) {
    return next(error)
  }
}

export default {}
