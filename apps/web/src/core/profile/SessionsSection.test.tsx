// @vitest-environment jsdom
//
// Regression test for the production toast
// `[body.token] Invalid input: expected string, received undefined`
// that the user reported when clicking "Завершити" in profile sessions.
//
// Better Auth's `/revoke-session` endpoint validates the body with
// `z.object({ token: z.string() })` (see
// `node_modules/better-auth/dist/api/routes/session.mjs`). The component
// previously passed `{ id }`, which lands as `body.token === undefined`
// and surfaces as the user-visible toast above. We pin the contract here
// so a future refactor cannot regress to `{ id }` silently.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const listSessionsMock = vi.fn<() => Promise<{ data: unknown[] }>>();
const revokeSessionMock = vi.fn<(d: unknown) => Promise<{ error: null }>>();

vi.mock("../auth/authClient.js", () => ({
  listSessions: () => listSessionsMock(),
  revokeSession: (data: unknown) => revokeSessionMock(data),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("@shared/hooks/useToast", () => ({
  useToast: () => ({ success: toastSuccessMock, error: toastErrorMock }),
}));

import { SessionsSection } from "./SessionsSection";

const SAMPLE_SESSION = {
  id: "sess_abc",
  token: "tok_def",
  userId: "u-1",
  expiresAt: new Date(Date.now() + 86_400_000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: "127.0.0.1",
  userAgent: "Safari/604.1",
};

describe("SessionsSection — revoke flow", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    listSessionsMock.mockResolvedValue({ data: [SAMPLE_SESSION] });
    revokeSessionMock.mockResolvedValue({ error: null });
  });

  it("calls revokeSession with the session token (NOT the id)", async () => {
    render(<SessionsSection online={true} />);

    // Wait for listSessions to populate the row.
    const revokeButton = await screen.findByRole("button", {
      name: /Завершити/i,
    });

    fireEvent.click(revokeButton);

    await waitFor(() => expect(revokeSessionMock).toHaveBeenCalledTimes(1));
    expect(revokeSessionMock).toHaveBeenCalledWith({ token: "tok_def" });
    // Critical contract pin — `id` must NOT be passed.
    expect(revokeSessionMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
    );
  });

  it("removes the session from the list and shows a success toast on success", async () => {
    render(<SessionsSection online={true} />);

    const revokeButton = await screen.findByRole("button", {
      name: /Завершити/i,
    });

    fireEvent.click(revokeButton);

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith("Сесію завершено"),
    );
    // After success the row is gone — fallback empty-state copy renders.
    expect(await screen.findByText(/Немає сесій/i)).toBeTruthy();
  });

  it("surfaces server error message in a toast on failure", async () => {
    revokeSessionMock.mockResolvedValueOnce({
      error: { message: "boom" },
    } as never);
    render(<SessionsSection online={true} />);

    const revokeButton = await screen.findByRole("button", {
      name: /Завершити/i,
    });

    fireEvent.click(revokeButton);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("boom"));
  });
});
