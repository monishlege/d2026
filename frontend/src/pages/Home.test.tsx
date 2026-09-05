import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Home from "@/pages/Home";
import * as api from "@/utils/api";
import { useAssistantStore } from "@/store/useAssistantStore";

vi.mock("@/utils/api", () => ({
  fetchSchemes: vi.fn().mockResolvedValue({
    schemes: [
      {
        name: "PM-KISAN",
        description: "Farmer income support",
        benefit_summary: "Rs. 6000 annual support",
      },
    ],
  }),
  submitSpeech: vi.fn(),
  askChat: vi.fn(),
  checkEligibility: vi.fn(),
  fetchDigiLocker: vi.fn(),
  scanUrl: vi.fn(),
}));

describe("Home", () => {
  beforeEach(() => {
    useAssistantStore.setState({
      transcript: "",
      detectedIntent: null,
      chatResult: null,
      isProcessingVoice: false,
    });
  });

  it("renders the main hero and loads schemes", async () => {
    render(<Home />);

    expect(screen.getByText(/JanRakshak AI/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/PM-KISAN Samman Nidhi/i).length).toBeGreaterThan(0);
    });
  });

  it("shows the kiosk mode toggle and the listen-to-response action when guidance exists", () => {
    useAssistantStore.setState({
      transcript: "Check my eligibility",
      detectedIntent: "eligibility_check",
      chatResult: {
        answer: "You are eligible for PM-KISAN.",
        confidence: "high",
        references: ["PM-KISAN"],
      },
    });

    render(<Home />);

    const kioskToggle = screen.getByRole("button", { name: /kiosk|low-data mode/i });
    expect(kioskToggle).toBeInTheDocument();

    fireEvent.click(kioskToggle);
    expect(screen.getByText(/Kiosk mode enabled/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /listen to response/i })).toBeInTheDocument();
  });

  it("retries the same-origin API when the primary backend is unavailable", async () => {
    const actualApi = await vi.importActual<typeof import("@/utils/api")>("@/utils/api");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: "You are eligible for PM-KISAN.",
            confidence: "medium",
            references: ["PM-KISAN"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const result = await actualApi.askChat("check pm-kisan", "hi");

    expect(result.answer).toContain("eligible");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toContain("/api/chat");

    fetchSpy.mockRestore();
  });

  it("shows a friendly offline fallback instead of exposing raw fetch errors", async () => {
    vi.mocked(api.submitSpeech).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Speak or type your scheme question here...");
    fireEvent.change(textarea, { target: { value: "Check my eligibility for PM-KISAN" } });
    fireEvent.click(screen.getByRole("button", { name: /process/i }));

    await waitFor(() => {
      expect(screen.getByText(/I couldn't reach the service right now/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Failed to fetch/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Backend service unavailable/i)).not.toBeInTheDocument();
  });
});
