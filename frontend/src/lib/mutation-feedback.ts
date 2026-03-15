import { toast } from 'sonner';

type IdPart = string | number | boolean | null | undefined;

interface MutationFeedbackOptions<T> {
  scope: string;
  idParts?: IdPart[];
  loadingMessage: string;
  successMessage?: string | ((result: T) => string | null | undefined) | null;
  errorMessage?: string | ((error: unknown) => string);
  execute: (idempotencyKey: string) => Promise<T>;
}

export function createIdempotencyKey(scope: string, ...parts: IdPart[]): string {
  const cleanParts = parts
    .filter((part) => part !== undefined && part !== null && String(part).length > 0)
    .map((part) => String(part));
  return `${scope}:${cleanParts.join(':')}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export async function runMutationWithFeedback<T>(
  options: MutationFeedbackOptions<T>
): Promise<T> {
  const {
    scope,
    idParts = [],
    loadingMessage,
    successMessage = null,
    errorMessage = 'Request failed',
    execute
  } = options;

  const idempotencyKey = createIdempotencyKey(scope, ...idParts);
  const loadingToastId = toast.loading(loadingMessage);

  try {
    const result = await execute(idempotencyKey);
    const resolvedSuccessMessage = typeof successMessage === 'function'
      ? successMessage(result)
      : successMessage;
    if (resolvedSuccessMessage) {
      toast.success(resolvedSuccessMessage);
    }
    return result;
  } catch (error: unknown) {
    const fallbackMessage = (error as { message?: string })?.message || 'Request failed';
    const resolvedErrorMessage = typeof errorMessage === 'function'
      ? errorMessage(error)
      : errorMessage;
    toast.error(resolvedErrorMessage || fallbackMessage);
    throw error;
  } finally {
    toast.dismiss(loadingToastId);
  }
}
