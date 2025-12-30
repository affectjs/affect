export default {
  // TypeScript 文件：针对每个包运行类型检查和格式化
  "packages/@affectjs/**/*.{ts,tsx}": (filenames) => {
    // 提取包名
    const packages = new Set();
    filenames.forEach((file) => {
      const match = file.match(/packages\/@affectjs\/([^/]+)\//);
      if (match) {
        packages.add(match[1]);
      }
    });

    // 为每个包运行 type-check，然后格式化所有文件
    const commands = [];
    packages.forEach((pkg) => {
      commands.push(`pnpm --filter @affectjs/${pkg} type-check`);
    });
    // 格式化所有暂存的文件
    // 显式传递文件名数组，确保 prettier 能正确处理所有文件（包括包含空格的文件名）
    if (filenames.length > 0) {
      // 使用引号包裹每个文件名，以正确处理包含空格的文件名
      const quotedFilenames = filenames.map((f) => `"${f}"`).join(" ");
      commands.push(`pnpm exec prettier --write ${quotedFilenames}`);
    }

    return commands;
  },
  // JavaScript 文件：格式化
  // 显式传递文件名数组，确保 prettier 能正确处理所有文件
  "**/*.{js,jsx}": (filenames) => {
    if (filenames.length === 0) return [];
    // 使用引号包裹每个文件名，以正确处理包含空格的文件名
    const quotedFilenames = filenames.map((f) => `"${f}"`).join(" ");
    return [`pnpm exec prettier --write ${quotedFilenames}`];
  },
  // JSON 文件：格式化
  // 显式传递文件名数组，确保 prettier 能正确处理所有文件
  "**/*.json": (filenames) => {
    if (filenames.length === 0) return [];
    // 使用引号包裹每个文件名，以正确处理包含空格的文件名
    const quotedFilenames = filenames.map((f) => `"${f}"`).join(" ");
    return [`pnpm exec prettier --write ${quotedFilenames}`];
  },
  // Markdown 文件：格式化
  // 显式传递文件名数组，确保 prettier 能正确处理所有文件
  "**/*.md": (filenames) => {
    if (filenames.length === 0) return [];
    // 使用引号包裹每个文件名，以正确处理包含空格的文件名
    const quotedFilenames = filenames.map((f) => `"${f}"`).join(" ");
    return [`pnpm exec prettier --write ${quotedFilenames}`];
  },
  // YAML 文件：格式化
  // 显式传递文件名数组，确保 prettier 能正确处理所有文件
  "**/*.{yml,yaml}": (filenames) => {
    if (filenames.length === 0) return [];
    // 使用引号包裹每个文件名，以正确处理包含空格的文件名
    const quotedFilenames = filenames.map((f) => `"${f}"`).join(" ");
    return [`pnpm exec prettier --write ${quotedFilenames}`];
  },
};
