// Rust Playground API 响应类型
export interface PlaygroundResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

/**
 * 向 Rust Playground 服务器执行代码
 * @param code - 要执行的 Rust 代码
 * @returns 包含执行结果的 PlaygroundResult 对象
 * @throws 如果 HTTP 请求失败（非 2xx 状态码）或网络错误，抛出相应的错误
 */
export async function executeCode(code: string): Promise<PlaygroundResult> {
  let response: Response;
  try {
    response = await fetch('https://play.rust-lang.org/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        channel: 'stable',
        edition: '2021',
        mode: 'debug',
        crateType: 'bin',
        tests: false,
        backtrace: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('无法连接到 Rust Playground，请检查网络连接');
  }

  if (!response.ok) {
    throw new Error(`Rust Playground API 请求失败，状态码: ${response.status}`);
  }

  const data = await response.json();
  return {
    success: Boolean(data.success),
    stdout: data.stdout ?? '',
    stderr: data.stderr ?? '',
  };
}
