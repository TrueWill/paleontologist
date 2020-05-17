export type ExperimentFunction<TParams extends any[], TResult> = (
  ...args: TParams
) => TResult;

export type ExperimentAsyncFunction<
  TParams extends any[],
  TResult,
> = ExperimentFunction<TParams, Promise<TResult>>;

export interface Results<TParams extends any[], TResult> {
  experimentName: string;
  experimentArguments: TParams;
  controlResult?: TResult;
  candidateResult?: TResult;
  controlError?: any;
  candidateError?: any;
  controlTimeMs?: number;
  candidateTimeMs?: number;
}

export interface Options<TParams extends any[], TResult> {
  publish?: (results: Results<TParams, TResult>) => void;
  enabled?: (...args: TParams) => boolean;
}

function defaultPublish<TParams extends any[], TResult>(
  results: Results<TParams, TResult>,
): void {
  if (
    results.candidateResult !== results.controlResult ||
    (results.candidateError && !results.controlError) ||
    (!results.candidateError && results.controlError)
  ) {
    console.warn(`Experiment ${results.experimentName}: difference found`);
  }
}

const defaultOptions = {
  publish: defaultPublish,
};

/**
 * A factory that creates an experiment function.
 *
 * @param name - The name of the experiment, typically for use in publish.
 * @param control - The legacy function you are trying to replace.
 * @param candidate - The new function intended to replace the control.
 * @param [options] - Options for the experiment. You will usually want to specify a publish function.
 * @returns A function that acts like the control while also running the candidate and publishing results.
 */
export function experiment<TParams extends any[], TResult>({
  name,
  control,
  candidate,
  options = defaultOptions,
}: {
  name: string;
  control: ExperimentFunction<TParams, TResult>;
  candidate: ExperimentFunction<TParams, TResult>;
  options?: Options<TParams, TResult>;
}): ExperimentFunction<TParams, TResult> {
  const publish = options.publish || defaultPublish;

  return (...args): TResult => {
    let controlResult: TResult | undefined;
    let candidateResult: TResult | undefined;
    let controlError: any;
    let candidateError: any;
    let controlTimeMs: number;
    let candidateTimeMs: number;
    const isEnabled: boolean = !options.enabled || options.enabled(...args);

    function publishResults(): void {
      if (isEnabled) {
        publish({
          experimentName: name,
          experimentArguments: args,
          controlResult,
          candidateResult,
          controlError,
          candidateError,
          controlTimeMs,
          candidateTimeMs,
        });
      }
    }

    if (isEnabled) {
      try {
        const candidateStartTime = performance.now();
        candidateResult = candidate(...args);
        const candidateEndTime = performance.now();
        candidateTimeMs = candidateEndTime - candidateStartTime;
      } catch (e) {
        candidateError = e;
      }
    }

    try {
      const controlStartTime = performance.now();
      controlResult = control(...args);
      const controlEndTime = performance.now();
      controlTimeMs = controlEndTime - controlStartTime;
    } catch (e) {
      controlError = e;
      publishResults();
      throw e;
    }

    publishResults();
    return controlResult;
  };
}

async function executeAndTime<TParams extends any[], TResult>(
  controlOrCandidate: ExperimentAsyncFunction<TParams, TResult>,
  args: TParams,
): Promise<[TResult, number]> {
  const startTime = performance.now();
  const result = await controlOrCandidate(...args);
  const endTime = performance.now();
  const timeMs = endTime - startTime;
  return [result, timeMs];
}

/**
 * A factory that creates an asynchronous experiment function.
 *
 * @param name - The name of the experiment, typically for use in publish.
 * @param control - The legacy async function you are trying to replace.
 * @param candidate - The new async function intended to replace the control.
 * @param [options] - Options for the experiment. You will usually want to specify a publish function.
 * @returns An async function that acts like the control while also running the candidate and publishing results.
 */
export function experimentAsync<TParams extends any[], TResult>({
  name,
  control,
  candidate,
  options = defaultOptions,
}: {
  name: string;
  control: ExperimentAsyncFunction<TParams, TResult>;
  candidate: ExperimentAsyncFunction<TParams, TResult>;
  options?: Options<TParams, TResult>;
}): ExperimentAsyncFunction<TParams, TResult> {
  const publish = options.publish || defaultPublish;

  return async (...args): Promise<TResult> => {
    let controlResult: TResult | undefined;
    let candidateResult: TResult | undefined;
    let controlError: any;
    let candidateError: any;
    let controlTimeMs: number | undefined;
    let candidateTimeMs: number | undefined;
    const isEnabled: boolean = !options.enabled || options.enabled(...args);

    function publishResults(): void {
      if (isEnabled) {
        publish({
          experimentName: name,
          experimentArguments: args,
          controlResult,
          candidateResult,
          controlError,
          candidateError,
          controlTimeMs,
          candidateTimeMs,
        });
      }
    }

    if (isEnabled) {
      // Run in parallel
      [
        [candidateResult, candidateTimeMs],
        [controlResult, controlTimeMs],
      ] = await Promise.all([
        executeAndTime(candidate, args).catch((e) => {
          candidateError = e;
          return [undefined, undefined];
        }),
        executeAndTime(control, args).catch((e) => {
          controlError = e;
          return [undefined, undefined];
        }),
      ]);
    } else {
      controlResult = await control(...args).catch((e) => {
        controlError = e;
        return undefined;
      });
    }

    publishResults();

    if (controlError) {
      throw controlError;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return controlResult!;
  };
}
