import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

// 7. Защита от Path Traversal
export default function serveStatic(baseDir: string) {
    // Нормализуем базовую директорию сразу
    const absoluteBase = path.resolve(baseDir);

    return (req: Request, res: Response, next: NextFunction) => {
        // Получаем путь из запроса и убираем возможные двойные точки и слеши
        const unsafePath = req.path;
        const filePath = path.resolve(absoluteBase, `.${  unsafePath}`);

        // Проверяем, что итоговый путь находится внутри baseDir
        if (!filePath.startsWith(absoluteBase + path.sep)) {
            // Попытка обхода директорий!
            return res.status(403).send('Доступ запрещён');
        }

        // Проверяем, существует ли файл
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // Файл не существует — передаём дальше
                return next();
            }
            // Файл существует, отправляем его клиенту
            return res.sendFile(filePath, (error) => {
                if (error) {
                    next(error);
                }
            });
        });
    }
}

