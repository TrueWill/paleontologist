import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";
import {
  spy,
  Spy,
} from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/spy.ts";
import * as scientist from "./mod.ts";

function sum(a: number, b: number): number {
  return a + b;
}

function sum2(a: number, b: number): number {
  return b + a;
}

Deno.test("when functions are equivalent it should return result", () => {
  const experiment = scientist.experiment({
    name: "equivalent1",
    control: sum,
    candidate: sum2,
    options: {
      publish: () => {},
    },
  });

  const result: number = experiment(1, 2);

  assertEquals(result, 3);
});

Deno.test("when functions are equivalent it should publish results", () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "equivalent2",
    control: sum,
    candidate: sum2,
    options: {
      publish: publishMock,
    },
  });

  experiment(1, 2);

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "equivalent2");
  assertEquals(results.experimentArguments, [1, 2]);
  assertEquals(results.controlResult, 3);
  assertEquals(results.candidateResult, 3);
  assertEquals(results.controlError, undefined);
  assertEquals(results.candidateError, undefined);
  assert(results.controlTimeMs !== undefined);
  assert(results.controlTimeMs >= 0);
  assert(results.candidateTimeMs !== undefined);
  assert(results.candidateTimeMs >= 0);
});

function ctrl(s: string): string {
  return `Ctrl+${s}`;
}

function candi(s: string): string {
  return s;
}

Deno.test("when function results differ it should return result of control", () => {
  const experiment = scientist.experiment({
    name: "differ1",
    control: ctrl,
    candidate: candi,
    options: {
      publish: () => {},
    },
  });

  const result: string = experiment("C");

  assertEquals(result, "Ctrl+C");
});

Deno.test("when function results differ it should publish results", () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "differ2",
    control: ctrl,
    candidate: candi,
    options: {
      publish: publishMock,
    },
  });

  experiment("C");

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "differ2");
  assertEquals(results.experimentArguments, ["C"]);
  assertEquals(results.controlResult, "Ctrl+C");
  assertEquals(results.candidateResult, "C");
  assertEquals(results.controlError, undefined);
  assertEquals(results.candidateError, undefined);
  assert(results.controlTimeMs !== undefined);
  assert(results.controlTimeMs >= 0);
  assert(results.candidateTimeMs !== undefined);
  assert(results.candidateTimeMs >= 0);
});

function ctrlSimple(): string {
  return "Everything is under control";
}

function candiThrower(): string {
  throw new Error("Candy I can't let you go");
}

Deno.test("when candidate throws it should return result of control", () => {
  const experiment = scientist.experiment({
    name: "throw1",
    control: ctrlSimple,
    candidate: candiThrower,
    options: {
      publish: () => {},
    },
  });

  const result: string = experiment();

  assertEquals(result, "Everything is under control");
});

Deno.test("when candidate throws it should publish results", () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "throw2",
    control: ctrlSimple,
    candidate: candiThrower,
    options: {
      publish: publishMock,
    },
  });

  experiment();

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "throw2");
  assertEquals(results.experimentArguments, []);
  assertEquals(results.controlResult, "Everything is under control");
  assertEquals(results.candidateResult, undefined);
  assertEquals(results.controlError, undefined);
  assert(results.candidateError !== undefined);
  assertEquals(results.candidateError.message, "Candy I can't let you go");
  assert(results.controlTimeMs !== undefined);
  assert(results.controlTimeMs >= 0);
  assertEquals(results.candidateTimeMs, undefined);
});

function ctrlThrower(): string {
  throw new Error("Kaos!");
}

function candiSimple(): string {
  return "Kane";
}

Deno.test("when control throws it should throw", () => {
  const experiment = scientist.experiment({
    name: "cthrow1",
    control: ctrlThrower,
    candidate: candiSimple,
    options: {
      publish: () => {},
    },
  });

  assertThrows(() => experiment(), Error, "Kaos!");
});

Deno.test("when control throws it should publish results", () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "cthrow2",
    control: ctrlThrower,
    candidate: candiSimple,
    options: {
      publish: publishMock,
    },
  });

  try {
    experiment();
  } catch {
    // swallow error
  }

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "cthrow2");
  assertEquals(results.experimentArguments, []);
  assertEquals(results.controlResult, undefined);
  assertEquals(results.candidateResult, "Kane");
  assert(results.controlError !== undefined);
  assertEquals(results.controlError.message, "Kaos!");
  assertEquals(results.candidateError, undefined);
  assertEquals(results.controlTimeMs, undefined);
  assert(results.candidateTimeMs !== undefined);
  assert(results.candidateTimeMs >= 0);
});

Deno.test("when both throw it should throw control error", () => {
  const experiment = scientist.experiment({
    name: "bothrow1",
    control: ctrlThrower,
    candidate: candiThrower,
    options: {
      publish: () => {},
    },
  });

  assertThrows(() => experiment(), Error, "Kaos!");
});

Deno.test("when both throw it should publish results", () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "bothrow2",
    control: ctrlThrower,
    candidate: candiThrower,
    options: {
      publish: publishMock,
    },
  });

  try {
    experiment();
  } catch {
    // swallow error
  }

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.experimentName, "bothrow2");
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

function enabledFalse(): boolean {
  return false;
}

Deno.test("when enabled returns false and control does not throw it should not run candidate", () => {
  const candidateMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "disabled1",
    control: ctrl,
    candidate: candidateMock,
    options: {
      publish: () => {},
      enabled: enabledFalse,
    },
  });

  experiment("C");

  assertEquals(candidateMock.calls.length, 0);
});

Deno.test("when enabled returns false and control does not throw it should return result of control", () => {
  const candidateMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "disabled2",
    control: ctrl,
    candidate: candidateMock,
    options: {
      publish: () => {},
      enabled: enabledFalse,
    },
  });

  const result: string = experiment("C");

  assertEquals(result, "Ctrl+C");
});

Deno.test("when enabled returns false and control does not throw it should not publish results", () => {
  const candidateMock: Spy<void> = spy();
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "disabled3",
    control: ctrl,
    candidate: candidateMock,
    options: {
      publish: publishMock,
      enabled: enabledFalse,
    },
  });

  experiment("C");

  assertEquals(publishMock.calls.length, 0);
});

function enabledTrue(): boolean {
  return true;
}

Deno.test("when enabled returns true and control does not throw it should run candidate", () => {
  const candidateMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "enabled1",
    control: ctrl,
    candidate: candidateMock,
    options: {
      publish: () => {},
      enabled: enabledTrue,
    },
  });

  experiment("C");

  assertEquals(candidateMock.calls.length, 1);
});

Deno.test("when enabled returns true and control does not throw it should return result of control", () => {
  const candidateMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "enabled2",
    control: ctrl,
    candidate: candidateMock,
    options: {
      publish: () => {},
      enabled: enabledTrue,
    },
  });

  const result: string = experiment("C");

  assertEquals(result, "Ctrl+C");
});

Deno.test("when enabled returns true and control does not throw it should publish results", () => {
  const candidateMock: Spy<void> = spy();
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "enabled3",
    control: ctrl,
    candidate: candidateMock,
    options: {
      publish: publishMock,
      enabled: enabledTrue,
    },
  });

  experiment("C");

  assertEquals(publishMock.calls.length, 1);
});

Deno.test("it should pass experiment params to enabled", () => {
  const candidateMock: Spy<void> = spy();
  const enabledMock: Spy<void> = spy(() => false);

  const experiment = scientist.experiment({
    name: "paramsToEnabled",
    control: ctrl,
    candidate: candidateMock,
    options: {
      publish: () => {},
      enabled: enabledMock,
    },
  });

  experiment("myparam");

  assertEquals(enabledMock.calls.length, 1);
  assertEquals(enabledMock.calls[0].args[0], "myparam");
});

Deno.test("when enabled returns false and control throws it should throw", () => {
  const candidateMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "disabledthrow1",
    control: ctrlThrower,
    candidate: candidateMock,
    options: {
      publish: () => {},
      enabled: enabledFalse,
    },
  });

  assertThrows(() => experiment(), Error, "Kaos!");
});

Deno.test("when enabled returns false and control throws it should not run candidate", () => {
  const candidateMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "disabledthrow2",
    control: ctrlThrower,
    candidate: candidateMock,
    options: {
      publish: () => {},
      enabled: enabledFalse,
    },
  });

  try {
    experiment();
  } catch {
    // swallow error
  }

  assertEquals(candidateMock.calls.length, 0);
});

Deno.test("when enabled returns false and control throws it should not publish results", () => {
  const candidateMock: Spy<void> = spy();
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "disabledthrow3",
    control: ctrlThrower,
    candidate: candidateMock,
    options: {
      publish: publishMock,
      enabled: enabledFalse,
    },
  });

  try {
    experiment();
  } catch {
    // swallow error
  }

  assertEquals(publishMock.calls.length, 0);
});

/*
  describe('when default options are used', () => {
    function ctrl(): number {
      return 1;
    }

    function candi(): number {
      return 2;
    }

    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when no options are specified', () => {
      it('should use sensible defaults', () => {
        const experiment = scientist.experiment({
          name: 'no1',
          control: ctrl,
          candidate: candi
        });

        experiment();

        expect(consoleSpy.mock.calls.length).toBe(1);
        expect(consoleSpy.mock.calls[0][0]).toBe(
          'Experiment no1: difference found'
        );
      });
    });

    describe('when only publish option is specified', () => {
      it('should enable experiment', () => {
        const experiment = scientist.experiment({
          name: 'opt1',
          control: ctrl,
          candidate: candi,
          options: {
            publish: publishMock
          }
        });

        experiment();

        expect(publishMock.mock.calls.length).toBe(1);
        const results = publishMock.mock.calls[0][0];
        expect(results.controlResult).toBe(1);
        expect(results.candidateResult).toBe(2);
      });
    });

    describe('when only enabled option is specified', () => {
      it('should use default publish', () => {
        const experiment = scientist.experiment({
          name: 'opt2',
          control: ctrl,
          candidate: candi,
          options: {
            enabled: (): boolean => true
          }
        });

        experiment();

        expect(consoleSpy.mock.calls.length).toBe(1);
        expect(consoleSpy.mock.calls[0][0]).toBe(
          'Experiment opt2: difference found'
        );
      });

      it('should respect enabled', () => {
        const candidateMock: jest.Mock<number, []> = jest.fn<number, []>();

        const experiment = scientist.experiment({
          name: 'opt3',
          control: ctrl,
          candidate: candidateMock,
          options: {
            enabled: (): boolean => false
          }
        });

        experiment();

        expect(consoleSpy.mock.calls.length).toBe(0);
        expect(candidateMock.mock.calls.length).toBe(0);
      });
    });
  });
});

describe('experimentAsync', () => {
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  describe('when functions are equivalent', () => {
    const publishMock: jest.Mock<
      void,
      [scientist.Results<[number, number], number>]
    > = jest.fn<void, [scientist.Results<[number, number], number>]>();

    afterEach(() => {
      publishMock.mockClear();
    });

    async function sum(a: number, b: number): Promise<number> {
      await sleep(250);
      return a + b;
    }

    async function sum2(a: number, b: number): Promise<number> {
      await sleep(125);
      return b + a;
    }

    it('should await result', async () => {
      const experiment = scientist.experimentAsync({
        name: 'async equivalent1',
        control: sum,
        candidate: sum2,
        options: {
          publish: publishMock
        }
      });

      const result: number = await experiment(1, 2);

      expect(result).toBe(3);
    });

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
