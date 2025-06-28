import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError, Types } from 'mongoose'
import { join } from 'path'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product from '../models/product'
import movingFile from '../utils/movingFile'

// Проверка валидности ObjectId MongoDB
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id
}

// GET /product
const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pageNum = Math.max(Number(req.query.page) || 1, 1)
    const limitNum = Math.min(Number(req.query.limit) || 5, 50)

    const options = {
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
    }

    const products = await Product.find({}, null, options)
    const totalProducts = await Product.countDocuments({})
    const totalPages = Math.ceil(totalProducts / limitNum)

    return res.status(constants.HTTP_STATUS_OK).send({
      items: products,
      pagination: {
        totalProducts,
        totalPages,
        currentPage: pageNum,
        pageSize: limitNum,
      },
    })
  } catch (err) {
    return next(err)
  }
}

// POST /product
const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { description, category, price, title, image } = req.body

    // Переносим картинку из временной папки (если есть)
    if (image) {
      await movingFile(
        image.fileName,
        join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
        join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
      )
    }

    const product = await Product.create({
      description,
      image,
      category,
      price,
      title,
    })

    return res.status(constants.HTTP_STATUS_CREATED).send(product)
  } catch (error) {
    if (error instanceof MongooseError.ValidationError) {
      return next(new BadRequestError(error.message))
    }
    if (error instanceof Error && error.message.includes('E11000')) {
      return next(new ConflictError('Товар с таким заголовком уже существует'))
    }
    return next(error)
  }
}

// TODO: Добавить guard admin
// PUT /product/:productId
const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId } = req.params
    if (!isValidObjectId(productId)) {
      return next(new BadRequestError('Передан не валидный ID товара'))
    }

    const { image } = req.body

    // Переносим картинку из временной папки (если есть)
    if (image) {
      await movingFile(
        image.fileName,
        join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
        join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
      )
    }

    // Явно указываем поля для обновления
    const updateData: any = {}
    if (typeof req.body.title === 'string') updateData.title = req.body.title
    if (typeof req.body.description === 'string') updateData.description = req.body.description
    if (typeof req.body.category === 'string') updateData.category = req.body.category
    updateData.price = req.body.price ? req.body.price : null
    if (req.body.image) updateData.image = req.body.image

    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { runValidators: true, new: true }
    ).orFail(() => new NotFoundError('Нет товара по заданному id'))

    return res.status(constants.HTTP_STATUS_OK).send(product)
  } catch (error) {
    if (error instanceof MongooseError.ValidationError) {
      return next(new BadRequestError(error.message))
    }
    if (error instanceof MongooseError.CastError) {
      return next(new BadRequestError('Передан не валидный ID товара'))
    }
    if (error instanceof Error && error.message.includes('E11000')) {
      return next(new ConflictError('Товар с таким заголовком уже существует'))
    }
    return next(error)
  }
}

// TODO: Добавить guard admin
// DELETE /product/:productId
const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId } = req.params
    if (!isValidObjectId(productId)) {
      return next(new BadRequestError('Передан не валидный ID товара'))
    }

    const product = await Product.findByIdAndDelete(productId).orFail(
      () => new NotFoundError('Нет товара по заданному id')
    )

    return res.status(constants.HTTP_STATUS_OK).send(product)
  } catch (error) {
    if (error instanceof MongooseError.CastError) {
      return next(new BadRequestError('Передан не валидный ID товара'))
    }
    return next(error)
  }
}

export { createProduct, deleteProduct, getProducts, updateProduct }
