// 直播开始宏 — 将「规划中」场次切换为「直播中」
// 安装方式：QuickAdd → Manage Macros → 新建 → Add Script → 选此文件

module.exports = async (params) => {
    const { quickAddApi: api, app } = params;

    // 1. 扫描所有「规划中」的单场剧本
    const scenes = app.vault.getMarkdownFiles().filter(f => {
        const fm = app.metadataCache.getFileCache(f)?.frontmatter;
        return fm?.type === '单场剧本' && fm?.执行状态 === '规划中';
    });

    if (!scenes.length) {
        new Notice('⚠️ 没有「规划中」的场次可开播', 5000);
        return;
    }

    // 2. 让导演选择本场场次
    const labels = scenes.map(f => {
        const fm = app.metadataCache.getFileCache(f)?.frontmatter;
        return `${fm?.场次 ?? ''} ${fm?.标题 ?? f.basename}`;
    });

    const chosen = await api.suggester(labels, scenes);
    if (!chosen) return; // 用户取消

    // 3. 修改 frontmatter：执行状态 → 直播中
    let content = await app.vault.read(chosen);
    content = content.replace(/^(执行状态:\s*).*$/m, '$1直播中');
    await app.vault.modify(chosen, content);

    // 4. 自动打开「直播偏差记录.md」准备实时记录
    const siblings = chosen.parent?.children ?? [];
    const deviationFile = siblings.find(f => f.name === '直播偏差记录.md');
    if (deviationFile) {
        await app.workspace.getLeaf(false).openFile(deviationFile);
    }

    const chosenLabel = labels[scenes.indexOf(chosen)];
    new Notice(`🎬 直播开始：${chosenLabel}\n已打开「直播偏差记录」`, 6000);
};
