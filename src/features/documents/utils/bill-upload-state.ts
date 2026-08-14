export type BillUploadUiState = Readonly<{
  status: "idle" | "uploading" | "error" | "success";
  file: File | null;
  message: string;
}>;

export type BillUploadUiAction =
  | Readonly<{ type: "select"; file: File | null }>
  | Readonly<{ type: "selection_error"; message: string }>
  | Readonly<{ type: "upload_started" }>
  | Readonly<{ type: "upload_failed"; message: string }>
  | Readonly<{ type: "upload_succeeded" }>;

export const INITIAL_BILL_UPLOAD_STATE: BillUploadUiState = {
  status: "idle",
  file: null,
  message: "",
};

export function billUploadUiReducer(
  state: BillUploadUiState,
  action: BillUploadUiAction,
): BillUploadUiState {
  switch (action.type) {
    case "select":
      return { status: "idle", file: action.file, message: "" };
    case "selection_error":
      return { status: "error", file: null, message: action.message };
    case "upload_started":
      return state.file ? { ...state, status: "uploading", message: "" } : state;
    case "upload_failed":
      return { ...state, status: "error", message: action.message };
    case "upload_succeeded":
      return { ...state, status: "success", message: "" };
  }
}
