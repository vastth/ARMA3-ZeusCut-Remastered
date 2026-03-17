// 直播结束宏 — 将「直播中」场次切换为「已完成」并填入直播日期
// 安装方式：QuickAdd → Manage Macros → 新建 → Add Script → 选此文件

module.exports = async (params) => {
    const { quickAddApi: api, app } = params;

    // 1. 扫描所有「直播中」的单场剧本
    const scenes = app.vault.getMarkdownFiles().filter(f => {
        const fm = app.metadataCache.getFileCache(f)?.frontmatter;
        return fm?.type === '单场剧本' && fm?.执行状态 === '直播中';
    });

    if (!scenes.length) {
        new Notice('⚠️ 没有「直播中」的场次', 5000);
        return;
    }

    // 2. 若只有一场则直接用；多场则弹出选择
    let chosen;
    let chosenLabel;

    if (scenes.length === 1) {
        chosen = scenes[0];
        const fm = app.metadataCache.getFileCache(chosen)?.frontmatter;
        chosenLabel = `${fm?.场次 ?? ''} ${fm?.标题 ?? chosen.basename}`;
    } else {
        const labels = scenes.map(f => {
            const fm = app.metadataCache.getFileCache(f)?.frontmatter;
            return `${fm?.场次 ?? ''} ${fm?.标题 ?? f.basename}`;
        });
        chosen = await api.suggester(labels, scenes);
        if (!chosen) return;
        chosenLabel = labels[scenes.indexOf(chosen)];
    }

    // 3. 修改 frontmatter：执行状态 → 已完成，直播日期 → 今天
    const today = new Date().toISOString().split('T')[0];
    let content = await app.vault.read(chosen);

    content = content.replace(/^(执行状态:\s*).*$/m, '$1已完成');

    // 直播日期：有值则覆盖，为空则填入
    if (/^直播日期:/m.test(content)) {
        content = content.replace(/^(直播日期:\s*).*$/m, `$1${today}`);
    }

    await app.vault.modify(chosen, content);

    // 4. 弹出直播后同步 Checklist 提示
    new Notice(
        `✅ 直播结束：${chosenLabel}\n\n` +
        `📋 直播后同步清单（叫 Claude 执行）：\n` +
        `  1. 填写「状态变更单」\n` +
        `  2. 填写「伏笔推进记录」\n` +
        `  3. 同步 L2（人物/地点/主线/未决）\n` +
        `  4. 填写「单场摘要」事件流\n` +
        `  5. 执行 arma3-sync-audit 审核库`,
        20000  // 显示 20 秒
    );
};
