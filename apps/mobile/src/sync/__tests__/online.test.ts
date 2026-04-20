/**
 * Unit tests for the `startOnlineTracker` reference-counter.
 *
 * These guard against a previous bug where a boolean `started` flag
 * let the first unmounting caller tear down the NetInfo subscription
 * for the entire app, silently disabling offline→online replay.
 */
import NetInfo from "@react-native-community/netinfo";

import {
  _resetOnlineForTest,
  isOnline,
  onOnlineChange,
  startOnlineTracker,
} from "../net/online";

type NetInfoTestApi = typeof NetInfo & {
  __setState: (next: {
    isConnected?: boolean;
    isInternetReachable?: boolean | null;
  }) => void;
  __reset: () => void;
};

const netInfo = NetInfo as NetInfoTestApi;

beforeEach(() => {
  netInfo.__reset();
  _resetOnlineForTest(true);
});

describe("startOnlineTracker — reference counting", () => {
  it("keeps the NetInfo listener alive when one of several callers unmounts", () => {
    const listener = jest.fn();
    const unsubListener = onOnlineChange(listener);

    const unsubA = startOnlineTracker();
    const unsubB = startOnlineTracker();

    // A unmounts first (e.g. child hook teardown). B must keep the
    // NetInfo listener alive.
    unsubA();

    // Flip connectivity offline → online.
    netInfo.__setState({ isConnected: false, isInternetReachable: false });
    netInfo.__setState({ isConnected: true, isInternetReachable: true });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(isOnline()).toBe(true);

    unsubB();
    unsubListener();
  });

  it("tears down the NetInfo listener only when the final subscriber unmounts", () => {
    const listener = jest.fn();
    const unsubListener = onOnlineChange(listener);

    const unsubA = startOnlineTracker();
    const unsubB = startOnlineTracker();
    unsubA();
    unsubB();

    // After everyone unmounted, offline→online transitions no longer
    // reach our subscribers. (This is the expected steady state when
    // the whole sync layer is torn down.)
    netInfo.__setState({ isConnected: false, isInternetReachable: false });
    netInfo.__setState({ isConnected: true, isInternetReachable: true });

    expect(listener).not.toHaveBeenCalled();
    unsubListener();
  });

  it("is safe against double-release from the same caller", () => {
    const unsubA = startOnlineTracker();
    const unsubB = startOnlineTracker();

    // Double-release on A must not decrement the counter into
    // negative territory or prematurely kill B's subscription.
    unsubA();
    unsubA();

    const listener = jest.fn();
    const unsubListener = onOnlineChange(listener);
    netInfo.__setState({ isConnected: false, isInternetReachable: false });
    netInfo.__setState({ isConnected: true, isInternetReachable: true });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubB();
    unsubListener();
  });
});
