import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std/testing/asserts.ts";
import {
  spy,
  Spy,
} from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/spy.ts";
import {
  stub,
  Stub,
} from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/stub.ts";
import * as scientist from "./mod.ts";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve: () => void) => setTimeout(resolve, ms));

async function sum(a: number, b: number): Promise<number> {
  await sleep(250);
  return a + b;
}

async function sum2(a: number, b: number): Promise<number> {
  await sleep(125);
  return b + a;
}

Deno.test("when async functions are equivalent it should await result", async () => {
  const experiment = scientist.experimentAsync({
    name: "async equivalent1",
    control: sum,
    candidate: sum2,
    options: {
      publish: () => {},
    },
  });

  const result: number = await experiment(1, 2);

  assertEquals(result, 3);
});

Deno.test("when async functions are equivalent it should publish results", async () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experimentAsync({
    name: "async equivalent2",
    control: sum,
    candidate: sum2,
    options: {
      publish: publishMock,
    },
  });

  await experiment(1, 2);

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "async equivalent2");
  assertEquals(results.experimentArguments, [1, 2]);
  assertEquals(results.controlResult, 3);
  assertEquals(results.candidateResult, 3);
  assertEquals(results.controlError, undefined);
  assertEquals(results.candidateError, undefined);
  assert(results.controlTimeMs !== undefined);
  assert(results.controlTimeMs > 0);
  assert(results.candidateTimeMs !== undefined);
  assert(results.candidateTimeMs > 0);
});

async function ctrl(s: string): Promise<string> {
  await sleep(250);
  return `Ctrl+${s}`;
}

async function candi(s: string): Promise<string> {
  await sleep(125);
  return s;
}

Deno.test("when async function results differ it should await result of control", async () => {
  const experiment = scientist.experimentAsync({
    name: "async differ1",
    control: ctrl,
    candidate: candi,
    options: {
      publish: () => {},
    },
  });

  const result: string = await experiment("C");

  assertEquals(result, "Ctrl+C");
});

Deno.test("when async function results differ it should publish results", async () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experimentAsync({
    name: "async differ2",
    control: ctrl,
    candidate: candi,
    options: {
      publish: publishMock,
    },
  });

  await experiment("C");

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "async differ2");
  assertEquals(results.experimentArguments, ["C"]);
  assertEquals(results.controlResult, "Ctrl+C");
  assertEquals(results.candidateResult, "C");
  assertEquals(results.controlError, undefined);
  assertEquals(results.candidateError, undefined);
  assert(results.controlTimeMs !== undefined);
  assert(results.controlTimeMs > 0);
  assert(results.candidateTimeMs !== undefined);
  assert(results.candidateTimeMs > 0);
});

async function ctrlSimple(): Promise<string> {
  await sleep(125);
  return "Everything is under control";
}

async function candiReject(): Promise<string> {
  return Promise.reject(new Error("Candy I can't let you go"));
}

Deno.test("when async candidate rejects it should await result of control", async () => {
  const experiment = scientist.experimentAsync({
    name: "async throw1",
    control: ctrlSimple,
    candidate: candiReject,
    options: {
      publish: () => {},
    },
  });

  const result: string = await experiment();

  assertEquals(result, "Everything is under control");
});

Deno.test("when async candidate rejects it should publish results", async () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experimentAsync({
    name: "async throw2",
    control: ctrlSimple,
    candidate: candiReject,
    options: {
      publish: publishMock,
    },
  });

  await experiment();

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "async throw2");
  assertEquals(results.experimentArguments, []);
  assertEquals(results.controlResult, "Everything is under control");
  assertEquals(results.candidateResult, undefined);
  assertEquals(results.controlError, undefined);
  assert(results.candidateError !== undefined);
  assertEquals(results.candidateError.message, "Candy I can't let you go");
  assert(results.controlTimeMs !== undefined);
  assert(results.controlTimeMs > 0);
  assertEquals(results.candidateTimeMs, undefined);
});

async function ctrlThrower(): Promise<string> {
  throw new Error("Kaos!");
}

async function candiSimple(): Promise<string> {
  await sleep(125);
  return "Kane";
}

Deno.test("when async control rejects it should reject", async () => {
  const experiment = scientist.experimentAsync({
    name: "async cthrow1",
    control: ctrlThrower,
    candidate: candiSimple,
    options: {
      publish: () => {},
    },
  });

  await assertThrowsAsync(
    async (): Promise<void> => {
      await experiment();
    },
    Error,
    "Kaos!",
  );
});

Deno.test("when async control rejects it should publish results", async () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experimentAsync({
    name: "async cthrow2",
    control: ctrlThrower,
    candidate: candiSimple,
    options: {
      publish: publishMock,
    },
  });

  try {
    await experiment();
  } catch {
    // swallow error
  }

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "async cthrow2");
  assertEquals(results.experimentArguments, []);
  assertEquals(results.controlResult, undefined);
  assertEquals(results.candidateResult, "Kane");
  assert(results.controlError !== undefined);
  assertEquals(results.controlError.message, "Kaos!");
  assertEquals(results.candidateError, undefined);
  assertEquals(results.controlTimeMs, undefined);
  assert(results.candidateTimeMs !== undefined);
  assert(results.candidateTimeMs > 0);
});

Deno.test("when async both reject it should reject with control error", async () => {
  const experiment = scientist.experimentAsync({
    name: "async bothrow1",
    control: ctrlThrower,
    candidate: candiReject,
    options: {
      publish: () => {},
    },
  });

  await assertThrowsAsync(
    async (): Promise<void> => {
      await experiment();
    },
    Error,
    "Kaos!",
  );
});

Deno.test("when async both reject it should publish results", async () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experimentAsync({
    name: "async bothrow2",
    control: ctrlThrower,
    candidate: candiReject,
    options: {
      publish: publishMock,
    },
  });

  try {
    await experiment();
  } catch {
    // swallow error
  }

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "async bothrow2");
  assertEquals(results.experimentArguments, []);
  assertEquals(results.controlResult, undefined);
  assertEquals(results.candidateResult, undefined);
  assert(results.controlError !== undefined);
  assertEquals(results.controlError.message, "Kaos!");
  assert(results.candidateError !== undefined);
  assertEquals(results.candidateError.message, "Candy I can't let you go");
  assertEquals(results.controlTimeMs, undefined);
  assertEquals(results.candidateTimeMs, undefined);
});

/*
describe('experimentAsync', () => {
  describe('when enabled option is specified', () => {
    const publishMock: jest.Mock<
      void,
      [scientist.Results<[string], string>]
    > = jest.fn<void, [scientist.Results<[string], string>]>();

    const candidateMock: jest.Mock<Promise<string>, [string]> = jest.fn<
      Promise<string>,
      [string]
    >();

    afterEach(() => {
      publishMock.mockClear();
      candidateMock.mockClear();
    });

    describe('when enabled returns false', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function enabled(_: string): boolean {
        return false;
      }

      describe('when control resolves', () => {
        async function ctrl(s: string): Promise<string> {
          await sleep(125);
          return `Ctrl+${s}`;
        }

        it('should not run candidate', async () => {
          const experiment = scientist.experimentAsync({
            name: 'async disabled1',
            control: ctrl,
            candidate: candidateMock,
            options: {
              publish: publishMock,
              enabled
            }
          });

          await experiment('C');

          expect(candidateMock.mock.calls.length).toBe(0);
        });

        it('should await result of control', async () => {
          const experiment = scientist.experimentAsync({
            name: 'async disabled2',
            control: ctrl,
            candidate: candidateMock,
            options: {
              publish: publishMock,
              enabled
            }
          });

          const result: string = await experiment('C');

          expect(result).toBe('Ctrl+C');
        });

        it('should not publish results', async () => {
          const experiment = scientist.experimentAsync({
            name: 'async disabled3',
            control: ctrl,
            candidate: candidateMock,
            options: {
              publish: publishMock,
              enabled
            }
          });

          await experiment('C');

          expect(publishMock.mock.calls.length).toBe(0);
        });
      });

      describe('when control rejects', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async function ctrl(_: string): Promise<string> {
          throw new Error('Kaos!');
        }

        it('should reject', () => {
          const experiment = scientist.experimentAsync({
            name: 'async cthrow1',
            control: ctrl,
            candidate: candidateMock,
            options: {
              publish: publishMock,
              enabled
            }
          });

          return expect(experiment('C')).rejects.toMatchObject({
            message: 'Kaos!'
          });
        });

        it('should not run candidate', async () => {
          const experiment = scientist.experimentAsync({
            name: 'async disabledthrow2',
            control: ctrl,
            candidate: candidateMock,
            options: {
              publish: publishMock,
              enabled
            }
          });

          try {
            await experiment('C');
          } catch {
            // swallow error
          }

          expect(candidateMock.mock.calls.length).toBe(0);
        });

        it('should not publish results', async () => {
          const experiment = scientist.experimentAsync({
            name: 'async disabledthrow3',
            control: ctrl,
            candidate: candidateMock,
            options: {
              publish: publishMock,
              enabled
            }
          });

          try {
            await experiment('C');
          } catch {
            // swallow error
          }

          expect(publishMock.mock.calls.length).toBe(0);
        });
      });
    });
  });

  describe('when functions are slow', () => {
    const publishMock: jest.Mock<
      void,
      [scientist.Results<[], string>]
    > = jest.fn<void, [scientist.Results<[], string>]>();

    afterEach(() => {
      publishMock.mockClear();
    });

    const msPerFunction = 1000;

    async function ctrl(): Promise<string> {
      await sleep(msPerFunction);
      return 'Control';
    }

    async function candi(): Promise<string> {
      await sleep(msPerFunction);
      return 'Candidate';
    }

    it('should run functions in parallel', async () => {
      const nsPerMs = 1000000;
      const allowedOverhead = 125;

      const experiment = scientist.experimentAsync({
        name: 'async parallel1',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      const start = process.hrtime.bigint();
      await experiment();
      const end = process.hrtime.bigint();

      const elapsedMs = Number((end - start) / BigInt(nsPerMs));

      expect(elapsedMs).toBeLessThan(msPerFunction + allowedOverhead);
    });

    it('should publish individual timings', async () => {
      const allowedVarianceMs = 125;
      const minMs = msPerFunction - allowedVarianceMs;
      const maxMs = msPerFunction + allowedVarianceMs;
      const experiment = scientist.experimentAsync({
        name: 'async parallel2',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      await experiment();

      expect(publishMock.mock.calls.length).toBe(1);
      const results = publishMock.mock.calls[0][0];
      expect(results.controlTimeMs).toBeDefined();
      expect(results.controlTimeMs).toBeGreaterThan(minMs);
      expect(results.controlTimeMs).toBeLessThan(maxMs);
      expect(results.candidateTimeMs).toBeDefined();
      expect(results.candidateTimeMs).toBeGreaterThan(minMs);
      expect(results.candidateTimeMs).toBeLessThan(maxMs);
    });
  });
});
*/
