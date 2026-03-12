export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export type HttpStatusType =
  | "informational"
  | "success"
  | "redirection"
  | "client_error"
  | "server_error";
