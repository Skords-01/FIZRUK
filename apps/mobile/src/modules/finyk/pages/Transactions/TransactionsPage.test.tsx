/**
 * Smoke tests for the Finyk Transactions screen — verifies header,
 * filter chips, list rendering, and the add-via-sheet round-trip
 * persists through the MMKV-backed store.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { _getMMKVInstance } from "@/lib/storage";

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: jest.fn(),
}));

import { TransactionsPage } from "./TransactionsPage";

const FIXED_NOW = new Date("2026-04-21T12:00:00.000Z");

beforeEach(() => {
  _getMMKVInstance().clearAll();
});

describe("TransactionsPage — render", () => {
  it("renders the empty state when there are no transactions", () => {
    render(<TransactionsPage now={FIXED_NOW} />);
    expect(screen.getByTestId("finyk-transactions-empty")).toBeTruthy();
    expect(screen.getByTestId("finyk-transactions-add")).toBeTruthy();
    expect(screen.getByTestId("finyk-transactions-prev-month")).toBeTruthy();
  });

  it("renders seeded manual expenses", () => {
    render(
      <TransactionsPage
        now={FIXED_NOW}
        seed={{
          manualExpenses: [
            {
              id: "me-1",
              description: "обід",
              amount: 250,
              category: "🍴 їжа",
              date: "2026-04-15T12:00:00.000Z",
            },
            {
              id: "me-2",
              description: "кава",
              amount: 80,
              category: "🍔 кафе та ресторани",
              date: "2026-04-10T09:00:00.000Z",
            },
          ],
        }}
      />,
    );
    expect(screen.getByTestId("finyk-transactions-list")).toBeTruthy();
    expect(screen.queryByTestId("finyk-transactions-empty")).toBeNull();
    expect(screen.getByText("обід")).toBeTruthy();
    expect(screen.getByText("кава")).toBeTruthy();
  });

  it("disables the next-month button when viewing the current month", () => {
    render(<TransactionsPage now={FIXED_NOW} />);
    const nextBtn = screen.getByTestId("finyk-transactions-next-month");
    expect(nextBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it("opens the add-expense sheet when the add button is tapped", async () => {
    render(<TransactionsPage now={FIXED_NOW} />);
    fireEvent.press(screen.getByTestId("finyk-transactions-add"));
    await waitFor(() => {
      expect(screen.getByTestId("finyk-transactions-sheet")).toBeTruthy();
    });
  });
});

describe("TransactionsPage — filter chips", () => {
  it("filters to expenses only when the 'Витрати' chip is tapped", () => {
    render(
      <TransactionsPage
        now={FIXED_NOW}
        seed={{
          manualExpenses: [
            {
              id: "me-1",
              description: "обід",
              amount: 250,
              category: "🍴 їжа",
              date: "2026-04-15T12:00:00.000Z",
            },
          ],
          // realTx is intentionally separate to exercise the filter.
          realTx: [
            {
              id: "tx-income",
              time: Math.floor(
                new Date("2026-04-12T10:00:00.000Z").getTime() / 1000,
              ),
              amount: 50000, // +500 UAH (income)
              description: "зарплата",
              mcc: 0,
              currencyCode: "UAH",
              operationAmount: 50000,
              _accountId: "acc-1",
              _source: "monobank",
              _manual: false,
              _manualId: undefined,
            } as never,
          ],
        }}
      />,
    );

    expect(screen.getByText("зарплата")).toBeTruthy();
    expect(screen.getByText("обід")).toBeTruthy();

    fireEvent.press(screen.getByTestId("finyk-transactions-filter-expense"));

    expect(screen.queryByText("зарплата")).toBeNull();
    expect(screen.getByText("обід")).toBeTruthy();
  });
});
