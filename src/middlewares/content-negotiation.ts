import { NextFunction, Request, Response } from "express";
import { create } from "xmlbuilder2";
import { getStatusType } from "../utils/http-status";
import { HttpStatusCode } from "../types/http-status";

/**
 * Recursively converts a JS object to an xmlbuilder2-compatible structure
 */
const toXmlStructure = (data: unknown, rootKey = "item"): unknown => {
  if (data === null || data === undefined) {
    return "";
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map((item: unknown) => toXmlStructure(item, rootKey));
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = toXmlStructure(value, key);
    }
    return result;
  }

  return String(data);
};

/**
 * Adds `res.respond()` method that auto-formats based on Accept header
 */
const contentNegotiation = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.respond = (data: unknown) => {
    const statusCode = res.statusCode || 200;
    let payload = data;
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      const statusType = getStatusType(statusCode as HttpStatusCode);

      if (statusType === "success") {
        payload = { status: "ok", ...(data as object) };
      } else if (statusType === "client_error") {
        payload = { status: "fail", ...(data as object) };
      } else if (statusType === "server_error") {
        payload = { status: "error", ...(data as object) };
      } else if (statusType === "redirection") {
        payload = { status: "redirect", ...(data as object) };
      } else if (statusType === "informational") {
        payload = { status: "info", ...(data as object) };
      }
    }

    const acceptHeader = req.headers["accept"] || "";

    res.status(statusCode);
    res.removeHeader("X-Powered-By");

    if (
      acceptHeader.includes("application/xml") ||
      acceptHeader.includes("text/xml")
    ) {
      res.setHeader("Content-Type", "application/xml");
      const xml = create({ version: "1.0", encoding: "UTF-8" })
        .ele("response")
        .ele(toXmlStructure(payload) as Record<string, unknown>)
        .end({ prettyPrint: true });
      res.send(xml);
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.json(payload);
  };

  next();
};

export default contentNegotiation;
