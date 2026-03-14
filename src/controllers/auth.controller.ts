import { NextFunction, Request, Response } from "express";

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, password } = req.body;
    console.log(name, email, password);

    return res.respond({
      data: req.body,
      message: "User registered successfully",
    });
  } catch (error) {
    return next(error);
  }
}
