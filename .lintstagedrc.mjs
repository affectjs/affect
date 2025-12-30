export default {
    // TypeScript 文件：针对每个包运行类型检查和格式化
    'packages/@affectjs/**/*.{ts,tsx}': (filenames) => {
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
        commands.push('pnpm exec prettier --write');

        return commands;
    },
    // JavaScript 文件：格式化
    '**/*.{js,jsx}': ['pnpm exec prettier --write'],
    // JSON 文件：格式化
    '**/*.json': ['pnpm exec prettier --write'],
    // Markdown 文件：格式化
    '**/*.md': ['pnpm exec prettier --write'],
    // YAML 文件：格式化
    '**/*.{yml,yaml}': ['pnpm exec prettier --write'],
};

