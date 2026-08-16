'''
Tests for infrastructure/ai_providers/circuit_breaker.py (moved here
from root anthropic_circuit_breaker.py as part of the Clean Architecture
reorg — same file, same tests, updated import path only) — including the
one part that's easy to get subtly wrong: the half-open trial slot must
be claimed by exactly one caller even when many requests hit it at the
exact same moment, not just when tested one at a time.
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import threading
import time
import pytest

import infrastructure.ai_providers.circuit_breaker as cb


@pytest.fixture(autouse=True)
def _reset():
    cb._reset_for_tests()
    yield
    cb._reset_for_tests()


def test_closed_by_default():
    assert cb.status()['closed'] is True


def test_stays_closed_on_success():
    with cb.guard():
        pass
    assert cb.status()['closed'] is True
    assert cb.status()['consecutive_failures'] == 0


def test_opens_after_threshold_consecutive_failures():
    for _ in range(cb.FAILURE_THRESHOLD):
        with pytest.raises(ValueError):
            with cb.guard():
                raise ValueError('simulated Anthropic failure')
    assert cb.status()['closed'] is False


def test_open_circuit_rejects_without_running_the_wrapped_code():
    for _ in range(cb.FAILURE_THRESHOLD):
        with pytest.raises(ValueError):
            with cb.guard():
                raise ValueError('boom')

    ran = False
    with pytest.raises(cb.CircuitOpenError):
        with cb.guard():
            ran = True  # must never execute — circuit is open
    assert ran is False


def test_success_before_threshold_resets_the_counter():
    for _ in range(cb.FAILURE_THRESHOLD - 1):
        with pytest.raises(ValueError):
            with cb.guard():
                raise ValueError('boom')
    assert cb.status()['closed'] is True  # not open yet

    with cb.guard():
        pass  # a success before hitting the threshold

    assert cb.status()['consecutive_failures'] == 0
    # confirms the counter really reset, not just capped: same number of
    # failures again should NOT be enough to open it on its own now
    for _ in range(cb.FAILURE_THRESHOLD - 1):
        with pytest.raises(ValueError):
            with cb.guard():
                raise ValueError('boom')
    assert cb.status()['closed'] is True


def test_reopens_if_the_half_open_trial_fails(monkeypatch):
    for _ in range(cb.FAILURE_THRESHOLD):
        with pytest.raises(ValueError):
            with cb.guard():
                raise ValueError('boom')
    assert cb.status()['closed'] is False

    # force the cooldown to have already elapsed
    monkeypatch.setattr(cb, '_opened_at', time.monotonic() - cb.COOLDOWN_SECONDS - 1)

    with pytest.raises(ValueError):
        with cb.guard():
            raise ValueError('trial also failed')
    assert cb.status()['closed'] is False  # reopened, not closed


def test_closes_if_the_half_open_trial_succeeds(monkeypatch):
    for _ in range(cb.FAILURE_THRESHOLD):
        with pytest.raises(ValueError):
            with cb.guard():
                raise ValueError('boom')
    monkeypatch.setattr(cb, '_opened_at', time.monotonic() - cb.COOLDOWN_SECONDS - 1)

    with cb.guard():
        pass  # trial succeeds

    assert cb.status()['closed'] is True


def test_half_open_trial_slot_claimed_by_exactly_one_thread(monkeypatch):
    '''
    The actual concurrency-correctness proof: with the cooldown already
    elapsed, fire many threads at the circuit at once. Exactly one may
    claim the trial slot and run the wrapped code; every other thread
    must be rejected immediately, not run it too.
    '''
    for _ in range(cb.FAILURE_THRESHOLD):
        with pytest.raises(ValueError):
            with cb.guard():
                raise ValueError('boom')
    monkeypatch.setattr(cb, '_opened_at', time.monotonic() - cb.COOLDOWN_SECONDS - 1)

    N = 40
    ran_count = [0]
    rejected_count = [0]
    ran_lock = threading.Lock()
    start_gate = threading.Barrier(N)

    def worker():
        start_gate.wait()  # maximize actual simultaneity
        try:
            with cb.guard():
                with ran_lock:
                    ran_count[0] += 1
                time.sleep(0.02)  # hold the trial slot briefly, like a real API call would
        except cb.CircuitOpenError:
            with ran_lock:
                rejected_count[0] += 1

    threads = [threading.Thread(target=worker) for _ in range(N)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=5)

    assert ran_count[0] == 1, f'expected exactly 1 thread to claim the trial slot, got {ran_count[0]}'
    assert rejected_count[0] == N - 1
