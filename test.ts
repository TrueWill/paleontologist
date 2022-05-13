import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";
import {
  spy,
  Spy,
} from "https://deno.land/x/mock@0.15.2/mod.ts";
import {
  stub,
  Stub,
} from "https://deno.land/x/mock@0.15.2/mod.ts";
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

function ctrlNumber(): number {
  return 1;
}

function candiNumber(): number {
  return 2;
}

Deno.test("when default options are used and no options are specified it should use sensible defaults", () => {
  const consoleStub: Stub<Console> = stub(console, "warn", () => {});

  try {
    const experiment = scientist.experiment({
      name: "no1",
      control: ctrlNumber,
      candidate: candiNumber,
    });

    experiment();

    assertEquals(consoleStub.calls.length, 1);
    assertEquals(
      consoleStub.calls[0].args[0],
      "Experiment no1: difference found",
    );
  } finally {
    consoleStub.restore();
  }
});

Deno.test("when default options are used and only publish option is specified it should enable experiment", () => {
  const publishMock: Spy<void> = spy();

  const experiment = scientist.experiment({
    name: "opt1",
    control: ctrlNumber,
    candidate: candiNumber,
    options: {
      publish: publishMock,
    },
  });

  experiment();

  assertEquals(publishMock.calls.length, 1);
  const results = publishMock.calls[0].args[0];
  assertEquals(results.controlResult, 1);
  assertEquals(results.candidateResult, 2);
});

Deno.test("when default options are used and only enabled option is specified it should use default publish", () => {
  const consoleStub: Stub<Console> = stub(console, "warn", () => {});

  try {
    const experiment = scientist.experiment({
      name: "opt2",
      control: ctrlNumber,
      candidate: candiNumber,
      options: {
        enabled: (): boolean => true,
      },
    });

    experiment();

    assertEquals(consoleStub.calls.length, 1);
    assertEquals(
      consoleStub.calls[0].args[0],
      "Experiment opt2: difference found",
    );
  } finally {
    consoleStub.restore();
  }
});

Deno.test("when default options are used and only enabled option is specified it should respect enabled", () => {
  const candidateMock: Spy<void> = spy();
  const consoleStub: Stub<Console> = stub(console, "warn", () => {});

  try {
    const experiment = scientist.experiment({
      name: "opt3",
      control: ctrlNumber,
      candidate: candidateMock,
      options: {
        enabled: (): boolean => false,
      },
    });

    experiment();

    assertEquals(consoleStub.calls.length, 0);
    assertEquals(candidateMock.calls.length, 0);
  } finally {
    consoleStub.restore();
  }
});
