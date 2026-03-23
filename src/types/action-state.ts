export type FieldErrors = Record<string, string[]>;

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
  redirectTo?: string;
  meta?: Record<string, string>;
};

export const INITIAL_ACTION_STATE: ActionState = {
  status: "idle",
};
