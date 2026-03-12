declare namespace Express {
  interface Response {
    respond: <T = unknown>(data: T) => void;
  }
}
