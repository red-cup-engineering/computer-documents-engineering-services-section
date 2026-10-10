export async function runJsonCommand(action) {
  try {
    const input = await new Promise((resolve, reject) => {
      let text = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { text += chunk; });
      process.stdin.on("end", () => { try { resolve(JSON.parse(text)); } catch (error) { reject(error); } });
      process.stdin.on("error", reject);
    });
    process.stdout.write(`${JSON.stringify(await action(input))}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ kind: "note-resource-refusal", code: error?.code ?? "invalid-input", message: error?.message ?? String(error) })}\n`);
    process.exitCode = 1;
  }
}
