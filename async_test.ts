import {
  assert,
  assertEquals,
  assertThrows,
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

/*
describe('experimentAsync', () => {
  describe('when functions are equivalent', () => {
    it('should publish results', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async equivalent2',
        control: sum,
        candidate: sum2,
        options: {
          publish: publishMock
        }
      });

      await experiment(1, 2);

      expect(publishMock.mock.calls.length).toBe(1);
      const results = publishMock.mock.calls[0][0];
      expect(results.experimentName).toBe('async equivalent2');
      expect(results.experimentArguments).toEqual([1, 2]);
      expect(results.controlResult).toBe(3);
      expect(results.candidateResult).toBe(3);
      expect(results.controlError).toBeUndefined();
      expect(results.candidateError).toBeUndefined();
      expect(results.controlTimeMs).toBeDefined();
      expect(results.controlTimeMs).toBeGreaterThan(0);
      expect(results.candidateTimeMs).toBeDefined();
      expect(results.candidateTimeMs).toBeGreaterThan(0);
    });
  });

  describe('when function results differ', () => {
    const publishMock: jest.Mock<
      void,
      [scientist.Results<[string], string>]
    > = jest.fn<void, [scientist.Results<[string], string>]>();

    afterEach(() => {
      publishMock.mockClear();
    });

    async function ctrl(s: string): Promise<string> {
      await sleep(250);
      return `Ctrl+${s}`;
    }

    async function candi(s: string): Promise<string> {
      await sleep(125);
      return s;
    }

    it('should await result of control', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async differ1',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      const result: string = await experiment('C');

      expect(result).toBe('Ctrl+C');
    });

    it('should publish results', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async differ2',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      await experiment('C');

      expect(publishMock.mock.calls.length).toBe(1);
      const results = publishMock.mock.calls[0][0];
      expect(results.experimentName).toBe('async differ2');
      expect(results.experimentArguments).toEqual(['C']);
      expect(results.controlResult).toBe('Ctrl+C');
      expect(results.candidateResult).toBe('C');
      expect(results.controlError).toBeUndefined();
      expect(results.candidateError).toBeUndefined();
      expect(results.controlTimeMs).toBeDefined();
      expect(results.controlTimeMs).toBeGreaterThan(0);
      expect(results.candidateTimeMs).toBeDefined();
      expect(results.candidateTimeMs).toBeGreaterThan(0);
    });
  });

  describe('when candidate rejects', () => {
    const publishMock: jest.Mock<
      void,
      [scientist.Results<[], string>]
    > = jest.fn<void, [scientist.Results<[], string>]>();

    afterEach(() => {
      publishMock.mockClear();
    });

    async function ctrl(): Promise<string> {
      await sleep(125);
      return 'Everything is under control';
    }

    async function candi(): Promise<string> {
      return Promise.reject(new Error("Candy I can't let you go"));
    }

    it('should await result of control', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async throw1',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      const result: string = await experiment();

      expect(result).toBe('Everything is under control');
    });

    it('should publish results', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async throw2',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      await experiment();

      expect(publishMock.mock.calls.length).toBe(1);
      const results = publishMock.mock.calls[0][0];
      expect(results.experimentName).toBe('async throw2');
      expect(results.experimentArguments).toEqual([]);
      expect(results.controlResult).toBe('Everything is under control');
      expect(results.candidateResult).toBeUndefined();
      expect(results.controlError).toBeUndefined();
      expect(results.candidateError).toBeDefined();
      expect(results.candidateError.message).toBe("Candy I can't let you go");
      expect(results.controlTimeMs).toBeDefined();
      expect(results.controlTimeMs).toBeGreaterThan(0);
      expect(results.candidateTimeMs).toBeUndefined();
    });
  });

  describe('when control rejects', () => {
    const publishMock: jest.Mock<
      void,
      [scientist.Results<[], string>]
    > = jest.fn<void, [scientist.Results<[], string>]>();

    afterEach(() => {
      publishMock.mockClear();
    });

    async function ctrl(): Promise<string> {
      throw new Error('Kaos!');
    }

    async function candi(): Promise<string> {
      await sleep(125);
      return 'Kane';
    }

    it('should reject', () => {
      const experiment = scientist.experimentAsync({
        name: 'async cthrow1',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      return expect(experiment()).rejects.toMatchObject({ message: 'Kaos!' });
    });

    it('should publish results', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async cthrow2',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      try {
        await experiment();
      } catch {
        // swallow error
      }

      expect(publishMock.mock.calls.length).toBe(1);
      const results = publishMock.mock.calls[0][0];
      expect(results.experimentName).toBe('async cthrow2');
      expect(results.experimentArguments).toEqual([]);
      expect(results.controlResult).toBeUndefined();
      expect(results.candidateResult).toBe('Kane');
      expect(results.controlError).toBeDefined();
      expect(results.controlError.message).toBe('Kaos!');
      expect(results.candidateError).toBeUndefined();
      expect(results.controlTimeMs).toBeUndefined();
      expect(results.candidateTimeMs).toBeDefined();
      expect(results.candidateTimeMs).toBeGreaterThan(0);
    });
  });

  describe('when both reject', () => {
    const publishMock: jest.Mock<
      void,
      [scientist.Results<[], string>]
    > = jest.fn<void, [scientist.Results<[], string>]>();

    afterEach(() => {
      publishMock.mockClear();
    });

    async function ctrl(): Promise<string> {
      throw new Error('Kaos!');
    }

    async function candi(): Promise<string> {
      return Promise.reject(new Error("Candy I can't let you go"));
    }

    it('should reject with control error', () => {
      const experiment = scientist.experimentAsync({
        name: 'async bothrow1',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      return expect(experiment()).rejects.toMatchObject({ message: 'Kaos!' });
    });

    it('should publish results', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async bothrow2',
        control: ctrl,
        candidate: candi,
        options: {
          publish: publishMock
        }
      });

      try {
        await experiment();
      } catch {
        // swallow error
      }

      expect(publishMock.mock.calls.length).toBe(1);
      const results = publishMock.mock.calls[0][0];
      expect(results.experimentName).toBe('async bothrow2');
      expect(results.experimentArguments).toEqual([]);
      expect(results.controlResult).toBeUndefined();
      expect(results.candidateResult).toBeUndefined();
      expect(results.controlError).toBeDefined();
      expect(results.controlError.message).toBe('Kaos!');
      expect(results.candidateError).toBeDefined();
      expect(results.candidateError.message).toBe("Candy I can't let you go");
      expect(results.controlTimeMs).toBeUndefined();
      expect(results.candidateTimeMs).toBeUndefined();
    });
  });

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
