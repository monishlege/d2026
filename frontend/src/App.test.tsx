import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import App from "@/App";

const { fetchSchemesMock, loginMock } = vi.hoisted(() => ({
  fetchSchemesMock: vi.fn().mockResolvedValue({
    schemes: [
      {
        name: "PM-KISAN",
        description: "Farmer income support",
        benefit_summary: "Rs. 6000 annual support",
      },
    ],
  }),
  loginMock: vi.fn().mockResolvedValue({ token: "demo-token", role: "admin" }),
}));

vi.mock("@/utils/api", () => ({
  fetchSchemes: fetchSchemesMock,
  login: loginMock,
  submitSpeech: vi.fn(),
  askChat: vi.fn(),
  checkEligibility: vi.fn(),
  fetchDigiLocker: vi.fn(),
  scanUrl: vi.fn(),
}));

describe("App security gate", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          storage.delete(key);
        }),
      },
      configurable: true,
    });
    vi.clearAllMocks();
  });

  it("requires authentication before showing the dashboard", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /secure access/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Secure@2026!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ username: "admin", password: "Secure@2026!" });
    });

    await waitFor(() => {
      expect(screen.getByText(/JanRakshak AI/i)).toBeInTheDocument();
    });
  });
});
