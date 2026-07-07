export type PythonRunRequest = {
  questionId: string;
  code: string;
  files?: Record<string, string>;
};

export type PythonRunResult = {
  stdout: string;
  stderr: string;
  generatedFiles: string[];
  sandboxMode: "mock" | "real";
};

export async function runPythonInSandbox(request: PythonRunRequest): Promise<PythonRunResult> {
  return {
    stdout: `Mock run for ${request.questionId}`,
    stderr: "",
    generatedFiles: [],
    sandboxMode: "mock",
  };
}
