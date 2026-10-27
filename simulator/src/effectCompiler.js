import ts from "typescript";

const MAX_SOURCE_LENGTH = 256 * 1024;

function diagnosticMessage(diagnostic) {
  const detail = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  const position = diagnostic.file && diagnostic.start !== undefined
    ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
    : null;
  return position ? `${position.line + 1}:${position.character + 1} ${detail}` : detail;
}

export function compileEffect(source) {
  if (typeof source !== "string" || !source.trim()) throw new Error("脚本内容不能为空");
  if (source.length > MAX_SOURCE_LENGTH) throw new Error("脚本超过 256 KB 限制");

  const syntax = ts.createSourceFile("effect.ts", source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
  if (syntax.parseDiagnostics.length) throw new Error(diagnosticMessage(syntax.parseDiagnostics[0]));
  if (syntax.statements.some((statement) => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isExportAssignment(statement) || statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))) {
    throw new Error("特效脚本使用全局 update()，不支持 import/export");
  }
  if (!syntax.statements.some((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "update" && statement.body)) {
    throw new Error("脚本需要定义 function update()。");
  }

  const result = ts.transpileModule(source, {
    fileName: "effect.ts",
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None, removeComments: false },
  });
  const error = result.diagnostics?.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (error) throw new Error(diagnosticMessage(error));
  new Function(result.outputText);
  return result.outputText.trimEnd() + "\n";
}
